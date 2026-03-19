package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.ChangePasswordRequest;
import com.authapp.dto.CreateProfileRequest;
import com.authapp.dto.EditProfileRequest;
import com.authapp.dto.ProfileResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "http://localhost:5173")
public class ProfileController {

    private static final double MIN_PASSWORD_ENTROPY_BITS = 45.0;

    @PostMapping("/onboarding")
    public ResponseEntity<ApiResponse<ProfileResponse>> createProfile(@Valid @RequestBody CreateProfileRequest request) {
        ProfileResponse payload = ProfileResponse.builder()
                .id(1L)
                .email(request.getEmail())
                .username(request.getUsername())
                .bio(request.getBio())
                .role(request.getRole())
                .avatarUrl(null)
                .build();

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Profile created successfully", payload));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile(@PathVariable Long userId) {
        ProfileResponse payload = ProfileResponse.builder()
                .id(userId)
                .email("user@example.com")
                .username("example_user")
                .bio("Sample bio from controller contract")
                .role("USER")
                .avatarUrl(null)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Profile fetched successfully", payload));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<ApiResponse<ProfileResponse>> updateProfile(
            @PathVariable Long userId,
            @Valid @RequestBody EditProfileRequest request) {

        ProfileResponse payload = ProfileResponse.builder()
                .id(userId)
                .email(request.getEmail())
                .username(request.getUsername())
                .bio(request.getBio())
                .role(request.getRole())
                .avatarUrl(null)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", payload));
    }

    @PostMapping(value = "/{userId}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<String>> uploadAvatar(
            @PathVariable Long userId,
            @RequestParam("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.failure("Avatar file is required"));
        }

        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", "avatar-placeholder-url"));
    }

    @PutMapping("/{userId}/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @PathVariable Long userId,
            @Valid @RequestBody ChangePasswordRequest request) {

        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.failure("New password and confirm new password do not match"));
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.failure("New password must be different from current password"));
        }

        double entropyBits = estimateEntropyBits(request.getNewPassword());
        if (entropyBits < MIN_PASSWORD_ENTROPY_BITS) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.failure("New password entropy is too low. Minimum required entropy is "
                            + MIN_PASSWORD_ENTROPY_BITS + " bits"));
        }

        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    private double estimateEntropyBits(String password) {
        if (password == null || password.isBlank()) {
            return 0;
        }

        int pool = 0;
        if (password.matches(".*[a-z].*")) pool += 26;
        if (password.matches(".*[A-Z].*")) pool += 26;
        if (password.matches(".*[0-9].*")) pool += 10;
        if (password.matches(".*[^a-zA-Z0-9].*")) pool += 32;

        if (pool == 0) {
            return 0;
        }

        return (Math.log(pool) / Math.log(2)) * password.length();
    }
}
