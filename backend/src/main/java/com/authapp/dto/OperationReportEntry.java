package com.authapp.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Traceable row in a daily operations report. */
@Value
@Builder
public class OperationReportEntry {
    Long eventId;
    String operationId;
    String status;
    String actionType;
    Long batchId;
    String batchName;
    Integer quantity;
    Integer quantityChange;
    BigDecimal measuredQuantity;
    String unit;
    Long correctionOfId;
    String actorUsername;
    LocalDateTime recordedAt;
    String remarks;
}
