package com.authapp.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class TaskResponse {
    Long id;
    String taskKey;
    String title;
    String description;
    String locationLabel;
    String status;
    String priority;
    LocalDateTime dueAt;
    LocalDateTime completedAt;
    Long assignedUserId;
    Long batchId;
}
