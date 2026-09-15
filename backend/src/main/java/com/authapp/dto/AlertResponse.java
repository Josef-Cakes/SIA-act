package com.authapp.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AlertResponse {
    Long id;
    String ruleCode;
    String message;
    String severity;
    String status;
    LocalDateTime dueAt;
    LocalDateTime createdAt;
    LocalDateTime acknowledgedAt;
    LocalDateTime resolvedAt;
    String resolutionNote;
    Long assignedUserId;
    Long batchId;
}
