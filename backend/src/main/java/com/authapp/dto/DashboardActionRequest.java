package com.authapp.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class DashboardActionRequest {

    @NotBlank(message = "Action type is required")
    private String actionType;

    @NotNull(message = "Batch ID is required")
    private Long batchId;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1")
    private Integer quantity;

    private String remarks;

    private String customerName;

    private Double unitPrice;

    /** Decimal measurement used by actions such as feeding in kilograms. */
    private BigDecimal measuredQuantity;

    /** Client-generated UUID used to make offline/retried actions idempotent. */
    @Size(max = 100, message = "Operation ID must be at most 100 characters")
    private String operationId;
}
