package com.authapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String username;
    private String fullName;
    private String phone;
    private String email;
}
