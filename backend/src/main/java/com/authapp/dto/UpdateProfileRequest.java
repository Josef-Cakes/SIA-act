package com.authapp.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._]+$", message = "Usernames can contain letters, numbers, underscores, and dots.")
    private String username;
    private String fullName;
    private String phone;
    private String email;
}
