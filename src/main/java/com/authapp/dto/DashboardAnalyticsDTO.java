package com.authapp.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.LinkedHashMap;
import java.util.Map;

@Data
@NoArgsConstructor
public class DashboardAnalyticsDTO {
    private Long totalLivestock;
    private Long activeEventsCount;
    private Double revenueToDate;
    private Map<String, Long> userActivityTrend = new LinkedHashMap<>();

    public DashboardAnalyticsDTO(Long totalLivestock, Long activeEventsCount, Double revenueToDate) {
        this.totalLivestock = totalLivestock;
        this.activeEventsCount = activeEventsCount;
        this.revenueToDate = revenueToDate;
    }
}
