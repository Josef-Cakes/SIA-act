package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private Long totalLivestock;
    private Long activeBatchCount;
    private Long todayActionCount;
    private List<DashboardBatchOptionDTO> availableBatches;
}
