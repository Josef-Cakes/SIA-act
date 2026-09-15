package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String role;           // User role (ROLE_ADMIN, ROLE_HANDLER)
    private String token;          // JWT token (included on login/register)
    private boolean hasProfileImage;
    private String profilePhotoUrl;
    private String createdAt;
}
