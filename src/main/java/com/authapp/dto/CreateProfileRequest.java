package com.authapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateProfileRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 24, message = "Username must be between 3 and 24 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._]+$", message = "Usernames can contain letters, numbers, underscores, and dots.")
    private String username;

    @NotBlank(message = "Bio is required")
    @Size(min = 10, max = 280, message = "Bio must be between 10 and 280 characters")
    private String bio;

    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(USER|MANAGER|ADMIN)$", message = "Role must be USER, MANAGER, or ADMIN")
    private String role;
}
