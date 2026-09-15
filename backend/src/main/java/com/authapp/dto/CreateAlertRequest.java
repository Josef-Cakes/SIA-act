package com.authapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateAlertRequest {
    @NotBlank(message = "Alert rule code is required")
    @Size(max = 80, message = "Alert rule code must be at most 80 characters")
    private String ruleCode;

    @NotBlank(message = "Alert message is required")
    @Size(max = 500, message = "Alert message must be at most 500 characters")
    private String message;

    @NotBlank(message = "Alert severity is required")
    private String severity;

    private LocalDateTime dueAt;
    private Long assignedUserId;
    private Long batchId;
}
