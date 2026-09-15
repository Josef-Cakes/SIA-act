package com.authapp.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateBatchAssignmentRequest {
    @NotNull(message = "Handler ID is required")
    private Long handlerId;
}
