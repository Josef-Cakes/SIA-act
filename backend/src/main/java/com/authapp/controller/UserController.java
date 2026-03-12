package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.UpdatePasswordRequest;
import com.authapp.dto.UpdateProfileRequest;
import com.authapp.dto.UserResponse;
import com.authapp.entity.User;
import com.authapp.repository.UserRepository;
import com.authapp.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@RestController
@RequestMapping("/api/user")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    // =============================================
    // GET /api/user/profile/{userId}
    // Returns user profile data
    // =============================================
    @GetMapping("/profile/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(@PathVariable Long userId) {
        ApiResponse<UserResponse> response = userService.getProfile(userId);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    // =============================================
    // PUT /api/user/profile/{userId}
    // Update user profile (username, email, fullName, phone)
    // =============================================
    @PutMapping("/profile/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @PathVariable Long userId,
            @RequestBody UpdateProfileRequest request) {

        ApiResponse<UserResponse> response = userService.updateProfile(userId, request);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // =============================================
    // PUT /api/user/password/{userId}
    // Change user password (requires current password)
    // =============================================
    @PutMapping("/password/{userId}")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable Long userId,
            @Valid @RequestBody UpdatePasswordRequest request) {

        ApiResponse<Void> response = userService.updatePassword(userId, request);

        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        }
    }

    // =============================================
    // POST /api/user/photo/{userId}
    // Upload profile image (JPG/PNG) → stored as BLOB
    // =============================================
    @PostMapping("/photo/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> uploadPhoto(
            @PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {
        try {
            ApiResponse<UserResponse> response = userService.uploadProfileImage(userId, file);

            if (response.isSuccess()) {
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            }
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.failure("Failed to upload image: " + e.getMessage()));
        }
    }

    // =============================================
    // GET /api/user/photo/{userId}
    // Serve the profile image bytes back as an image
    // =============================================
    @GetMapping("/photo/{userId}")
    public ResponseEntity<byte[]> getProfilePhoto(@PathVariable Long userId) {
        Optional<User> userOptional = userRepository.findById(userId);

        if (userOptional.isEmpty() || userOptional.get().getProfileImage() == null) {
            return ResponseEntity.notFound().build();
        }

        User user = userOptional.get();
        String contentType = user.getProfileImageType() != null
                ? user.getProfileImageType()
                : "image/jpeg";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(contentType));
        headers.setContentLength(user.getProfileImage().length);

        return ResponseEntity.ok()
                .headers(headers)
                .body(user.getProfileImage());
    }
}
