package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardActionResponse {
    private Long eventId;
    private Long saleId;
    private String actionType;
    private Long batchId;
    private String batchName;
    private Integer quantity;
    private String customerName;
    private Double unitPrice;
    private Double totalAmount;
    private Integer updatedCurrentCount;
    private LocalDateTime timestamp;
}
