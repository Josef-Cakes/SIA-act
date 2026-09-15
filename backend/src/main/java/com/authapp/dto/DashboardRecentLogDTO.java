package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardRecentLogDTO {
    private Long id;
    private String actionType;
    private Long batchId;
    private String batchName;
    private Integer quantity;
    private BigDecimal measuredQuantity;
    private String remarks;
    private LocalDateTime timestamp;
}
