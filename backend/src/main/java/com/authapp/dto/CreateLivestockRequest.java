package com.authapp.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateLivestockRequest {

    @NotBlank(message = "Livestock type is required")
    private String type;
}
