package com.authapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CorrectionRequest {

    @NotBlank(message = "A correction reason is required")
    @Size(max = 500, message = "Correction reason must be at most 500 characters")
    private String reason;

    /** Client-generated key so a retry cannot reverse the same operation twice. */
    @Size(max = 100, message = "Operation ID must be at most 100 characters")
    private String operationId;
}
