package com.authapp.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Ledger-backed daily report used for manager review and export. */
@Value
@Builder
public class DailyOperationsReportResponse {
    LocalDate date;
    long totalOperations;
    long totalHeadcountChange;
    BigDecimal totalFeedKg;
    List<OperationReportEntry> entries;
}
