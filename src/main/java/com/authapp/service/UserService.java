package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.*;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.UserRepository;
import com.authapp.security.JwtUtil;
import jakarta.transaction.Transactional;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EventLogger eventLogger;

    // Allowed image types
    private static final List<String> ALLOWED_IMAGE_TYPES = Arrays.asList(
            "image/jpeg", "image/jpg", "image/png"
    );

    public UserService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil,
            EventLogger eventLogger
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.eventLogger = eventLogger;
    }

    // =============================================
    // REGISTER (New users get ROLE_HANDLER by default)
    // =============================================
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ApiResponse<UserResponse> register(RegisterRequest request) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            return ApiResponse.failure("An account with this email already exists.");
        }

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            return ApiResponse.failure("This username is already taken. Please choose another.");
        }

        // Hash the password before saving
        String hashedPassword = passwordEncoder.encode(request.getPassword());

        // Build and save the user (default role: ROLE_HANDLER)
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(hashedPassword)
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .role(Role.ROLE_HANDLER)  // Default role for new registrations
                .build();

        User savedUser = userRepository.save(user);

        // Generate JWT token
        String token = jwtUtil.generateToken(savedUser.getId(), savedUser.getUsername(), savedUser.getRole());

        return ApiResponse.success("Registration successful! Welcome aboard.", toUserResponse(savedUser, token));
    }

    // =============================================
    // LOGIN (by Username) - Returns JWT token
    // =============================================
    public ApiResponse<UserResponse> login(LoginRequest request) {
        // Find user by username (unique login credential)
        Optional<User> userOptional = userRepository.findByUsername(request.getUsername());

        if (userOptional.isEmpty()) {
            return ApiResponse.failure("Invalid username or password.");
        }

        User user = userOptional.get();

        // Verify password against BCrypt hash
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ApiResponse.failure("Invalid username or password.");
        }

        // Generate JWT token with role
        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        eventLogger.logActivity(user.getId(), "LOGIN", user.getId(), null);

        return ApiResponse.success("Login successful! Welcome back, " + user.getUsername() + ".", toUserResponse(user, token));
    }

    // =============================================
    // GET PROFILE
    // =============================================
    public ApiResponse<UserResponse> getProfile(Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return ApiResponse.failure("User not found.");
        }

        return ApiResponse.success("Profile retrieved successfully.", toUserResponse(userOptional.get(), null));
    }

    // =============================================
    // EDIT PROFILE
    // =============================================
    public ApiResponse<UserResponse> updateProfile(Long userId, UpdateProfileRequest request) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty()) {
            return ApiResponse.failure("User not found.");
        }

        User user = userOptional.get();

        // Check if new username is taken by another user
        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                return ApiResponse.failure("Username '" + request.getUsername() + "' is already taken.");
            }
            user.setUsername(request.getUsername());
        }

        // Check if new email is taken by another user
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                return ApiResponse.failure("Email '" + request.getEmail() + "' is already in use.");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getFullName() != null) user.setFullName(request.getFullName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        User updatedUser = userRepository.save(user);
        return ApiResponse.success("Profile updated successfully.", toUserResponse(updatedUser, null));
    }

    // =============================================
    // EDIT PASSWORD
    // =============================================
    public ApiResponse<Void> updatePassword(Long userId, UpdatePasswordRequest request) {
        // Validate new password matches confirm
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ApiResponse.failure("New password and confirm password do not match.");
        }

        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return ApiResponse.failure("User not found.");
        }

        User user = userOptional.get();

        // Verify current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            return ApiResponse.failure("Current password is incorrect.");
        }

        // Hash and save new password
        String hashedNewPassword = passwordEncoder.encode(request.getNewPassword());
        userRepository.updatePassword(userId, hashedNewPassword);

        return ApiResponse.success("Password updated successfully.");
    }

    // =============================================
    // UPLOAD PROFILE PHOTO
    // =============================================
    public ApiResponse<UserResponse> uploadProfileImage(Long userId, MultipartFile file) throws IOException {
        // Validate user exists
        Optional<User> userOptional = userRepository.findById(userId);
        if (userOptional.isEmpty()) {
            return ApiResponse.failure("User not found.");
        }

        // Validate file is not empty
        if (file.isEmpty()) {
            return ApiResponse.failure("Please select a file to upload.");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            return ApiResponse.failure("Only JPG and PNG image files are allowed.");
        }

        // Validate file size (max 5MB)
        if (file.getSize() > 5 * 1024 * 1024) {
            return ApiResponse.failure("File size must not exceed 5MB.");
        }

        // Convert to byte array and save
        byte[] imageBytes = file.getBytes();
        userRepository.updateProfileImage(userId, imageBytes, contentType);

        // Fetch updated user
        User updatedUser = userRepository.findById(userId).get();
        return ApiResponse.success("Profile image uploaded successfully.", toUserResponse(updatedUser, null));
    }

    // =============================================
    // HELPER: Convert User entity -> UserResponse DTO
    // =============================================
    private UserResponse toUserResponse(User user, String token) {
        boolean hasProfileImage = user.getProfileImage() != null && user.getProfileImage().length > 0;

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().name() : Role.ROLE_HANDLER.name())
                .token(token)  // JWT token (null for non-auth responses)
                .hasProfileImage(hasProfileImage)
                .profilePhotoUrl(hasProfileImage ? "/api/user/photo/" + user.getId() : null)
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }
}
