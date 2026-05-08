package com.authapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateBatchRequest {

    @NotNull(message = "Livestock ID is required")
    private Long livestockId;

    @NotBlank(message = "Batch name is required")
    private String name;

    @NotNull(message = "Initial count is required")
    @Min(value = 1, message = "Initial count must be at least 1")
    private Integer initialCount;

    private String breed;

    @NotNull(message = "Arrival date is required")
    private LocalDate arrivalDate;
}
