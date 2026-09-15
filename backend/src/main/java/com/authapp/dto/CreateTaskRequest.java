package com.authapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateTaskRequest {
    @NotBlank(message = "Task title is required")
    @Size(max = 120, message = "Task title must be at most 120 characters")
    private String title;

    @Size(max = 500, message = "Task description must be at most 500 characters")
    private String description;

    @Size(max = 120, message = "Location must be at most 120 characters")
    private String locationLabel;

    @NotBlank(message = "Task priority is required")
    private String priority;

    private LocalDateTime dueAt;
    private Long assignedUserId;
    private Long batchId;
}
