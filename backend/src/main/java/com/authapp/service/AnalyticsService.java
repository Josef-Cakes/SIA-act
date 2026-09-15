package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.ActivityTrendPointDTO;
import com.authapp.dto.BusinessTrendPointDTO;
import com.authapp.dto.DailyDoubleMetricDTO;
import com.authapp.dto.DailyDecimalMetricDTO;
import com.authapp.dto.DailyLongMetricDTO;
import com.authapp.dto.DashboardAnalyticsDTO;
import com.authapp.dto.ResourceEfficiencyPointDTO;
import com.authapp.entity.ActivityLog;
import com.authapp.repository.ActivityLogRepository;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.EventRepository;
import com.authapp.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalyticsService {

    private static final int TREND_DAYS = 7;
    private static final String DEFAULT_RANGE = "7d";
    private final BatchRepository batchRepository;
    private final EventRepository eventRepository;
    private final SaleRepository saleRepository;
    private final ActivityLogRepository activityLogRepository;

    @Cacheable(value = CacheNames.FARM_DATA, key = "'analytics-summary'")
    public DashboardAnalyticsDTO getDashboardSummary() {
        DashboardAnalyticsDTO analytics = new DashboardAnalyticsDTO(
                defaultLong(batchRepository.sumCurrentCount()),
                defaultLong(eventRepository.countCreatedSince(LocalDateTime.now().minusHours(24))),
                defaultDouble(saleRepository.calculateRevenueToDate())
        );

        analytics.setUserActivityTrend(buildUserActivityTrend());
        return analytics;
    }

    @Cacheable(
            value = CacheNames.FARM_DATA,
            key = "'business-trends-' + (#range == null ? '" + DEFAULT_RANGE + "' : #range.trim().toLowerCase())"
    )
    public List<BusinessTrendPointDTO> getBusinessTrends(String range) {
        TrendRange trendRange = TrendRange.from(range);
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = resolveStartDate(trendRange, endDate);
        LocalDateTime since = startDate.atStartOfDay();

        Map<LocalDate, BusinessTrendAccumulator> byDay = initializeTrendRange(startDate, endDate);

        List<DailyDoubleMetricDTO> revenuePoints = trendRange == TrendRange.ALL_TIME
                ? saleRepository.sumRevenueByDayAllTime()
                : saleRepository.sumRevenueByDaySince(since);
        revenuePoints.forEach(point -> {
            LocalDate date = parseDate(point.getDate());
            if (date != null && byDay.containsKey(date)) {
                byDay.get(date).setTotalRevenue(defaultDouble(point.getValue()));
            }
        });

        List<DailyLongMetricDTO> mortalityPoints = trendRange == TrendRange.ALL_TIME
                ? eventRepository.sumMortalityQuantityByDayAllTime()
                : eventRepository.sumMortalityQuantityByDaySince(since);
        mortalityPoints.forEach(point -> {
            LocalDate date = parseDate(point.getDate());
            if (date != null && byDay.containsKey(date)) {
                byDay.get(date).addMortalityCount(defaultLong(point.getValue()));
            }
        });

        Map<LocalDate, Long> eventChangesByDay = toLongMap(trendRange == TrendRange.ALL_TIME
                ? eventRepository.sumQuantityChangeByDayAllTime()
                : eventRepository.sumQuantityChangeByDaySince(since));
        Map<LocalDate, Long> batchCreationsByDay = toLongMap(trendRange == TrendRange.ALL_TIME
                ? batchRepository.sumInitialCountByCreatedDayAllTime()
                : batchRepository.sumInitialCountByCreatedDaySince(since));

        long stockAtEndOfDay = defaultLong(batchRepository.sumCurrentCount());
        LocalDate cursor = endDate;
        while (!cursor.isBefore(startDate)) {
            BusinessTrendAccumulator accumulator = byDay.get(cursor);
            if (accumulator != null) {
                accumulator.setCurrentStock(stockAtEndOfDay);
            }

            stockAtEndOfDay -= eventChangesByDay.getOrDefault(cursor, 0L);
            stockAtEndOfDay -= batchCreationsByDay.getOrDefault(cursor, 0L);
            cursor = cursor.minusDays(1);
        }

        List<BusinessTrendPointDTO> trends = new ArrayList<>(byDay.size());
        byDay.forEach((date, value) -> trends.add(new BusinessTrendPointDTO(
                date.toString(),
                value.getTotalRevenue(),
                value.getMortalityCount(),
                Math.max(0L, value.getCurrentStock())
        )));
        return trends;
    }

    @Cacheable(
            value = CacheNames.FARM_DATA,
            key = "'resource-efficiency-' + #livestockId + '-' + (#range == null ? '7d' : #range.trim().toLowerCase())"
    )
    public List<ResourceEfficiencyPointDTO> getResourceEfficiency(Long livestockId, String range) {
        if (livestockId == null) {
            throw new IllegalArgumentException("Livestock ID is required.");
        }

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = resolveResourceEfficiencyStartDate(range, endDate);
        LocalDateTime since = startDate.atStartOfDay();

        Map<LocalDate, ResourceEfficiencyAccumulator> byDay = new LinkedHashMap<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            byDay.put(cursor, new ResourceEfficiencyAccumulator());
            cursor = cursor.plusDays(1);
        }

        List<DailyDecimalMetricDTO> feedPoints = eventRepository.sumFeedingQuantityByDaySinceAndLivestockId(livestockId, since);
        feedPoints.forEach(point -> {
            LocalDate date = parseDate(point.getDate());
            if (date != null && byDay.containsKey(date)) {
                byDay.get(date).setFeedConsumed(point.getValue() != null ? point.getValue().doubleValue() : 0.0);
            }
        });

        Map<LocalDate, Long> eventChangesByDay = toLongMap(
                eventRepository.sumQuantityChangeByDaySinceAndLivestockId(livestockId, since)
        );
        Map<LocalDate, Long> batchCreationsByDay = toLongMap(
                batchRepository.sumInitialCountByCreatedDaySinceAndLivestockId(livestockId, since)
        );

        long populationAtEndOfDay = defaultLong(batchRepository.sumCurrentCountByLivestockId(livestockId));
        long initialPopulationAtEndOfDay = defaultLong(batchRepository.sumInitialCountByLivestockId(livestockId));

        cursor = endDate;
        while (!cursor.isBefore(startDate)) {
            ResourceEfficiencyAccumulator accumulator = byDay.get(cursor);
            if (accumulator != null) {
                accumulator.setActivePopulation(Math.max(0L, populationAtEndOfDay));
                accumulator.setSurvivalRate(calculateSurvivalRate(populationAtEndOfDay, initialPopulationAtEndOfDay));
            }

            populationAtEndOfDay -= eventChangesByDay.getOrDefault(cursor, 0L);
            initialPopulationAtEndOfDay -= batchCreationsByDay.getOrDefault(cursor, 0L);
            populationAtEndOfDay -= batchCreationsByDay.getOrDefault(cursor, 0L);
            cursor = cursor.minusDays(1);
        }

        List<ResourceEfficiencyPointDTO> points = new ArrayList<>(byDay.size());
        byDay.forEach((date, value) -> points.add(new ResourceEfficiencyPointDTO(
                date.toString(),
                value.getFeedConsumed(),
                value.getSurvivalRate(),
                Math.max(0L, value.getActivePopulation())
        )));
        return points;
    }

    private Map<String, Long> buildUserActivityTrend() {
        LocalDate startDate = LocalDate.now().minusDays(TREND_DAYS - 1L);
        LocalDateTime trendStart = startDate.atStartOfDay();

        Map<String, Long> trend = new LinkedHashMap<>();
        for (int i = 0; i < TREND_DAYS; i++) {
            LocalDate date = startDate.plusDays(i);
            trend.put(date.toString(), 0L);
        }

        List<ActivityTrendPointDTO> trendPoints = activityLogRepository.findDailyTrendSince(trendStart);
        for (ActivityTrendPointDTO point : trendPoints) {
            trend.put(point.getDate(), defaultLong(point.getCount()));
        }

        return trend;
    }

    private LocalDate resolveStartDate(TrendRange trendRange, LocalDate endDate) {
        if (trendRange == TrendRange.YEAR_TO_DATE) {
            return endDate.withDayOfYear(1);
        }

        if (trendRange == TrendRange.LAST_30_DAYS) {
            return endDate.minusDays(29);
        }

        if (trendRange == TrendRange.LAST_7_DAYS) {
            return endDate.minusDays(6);
        }

        List<LocalDate> candidateDates = new ArrayList<>();
        addCandidate(candidateDates, saleRepository.findEarliestCreatedAt());
        addCandidate(candidateDates, eventRepository.findEarliestCreatedAtByEventTypeCode("MORTALITY"));
        addCandidate(candidateDates, eventRepository.findEarliestCreatedAt());
        addCandidate(candidateDates, batchRepository.findEarliestCreatedAt());

        return candidateDates.stream()
                .min(LocalDate::compareTo)
                .orElse(endDate);
    }

    private LocalDate resolveResourceEfficiencyStartDate(String range, LocalDate endDate) {
        String normalized = normalizeResourceRangeKey(range);
        if ("ytd".equals(normalized)) {
            return endDate.withDayOfYear(1);
        }

        if ("all".equals(normalized)) {
            return resolveStartDate(TrendRange.ALL_TIME, endDate);
        }

        int dayWindow = 7;
        try {
            dayWindow = Integer.parseInt(normalized);
        } catch (NumberFormatException ignored) {
            // Fall back to the default 7-day window.
        }

        return endDate.minusDays(Math.max(0, dayWindow - 1L));
    }

    private String normalizeResourceRangeKey(String range) {
        if (range == null || range.isBlank()) {
            return "7";
        }

        String normalized = range.trim().toLowerCase();
        if ("ytd".equals(normalized) || "year_to_date".equals(normalized) || "year-to-date".equals(normalized)) {
            return "ytd";
        }
        if ("all".equals(normalized) || "all_time".equals(normalized) || "alltime".equals(normalized)) {
            return "all";
        }
        if (normalized.endsWith("d")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }

        return normalized.matches("\\d+") ? normalized : "7";
    }

    private Map<LocalDate, BusinessTrendAccumulator> initializeTrendRange(LocalDate startDate, LocalDate endDate) {
        Map<LocalDate, BusinessTrendAccumulator> points = new LinkedHashMap<>();
        LocalDate cursor = startDate;
        while (!cursor.isAfter(endDate)) {
            points.put(cursor, new BusinessTrendAccumulator());
            cursor = cursor.plusDays(1);
        }
        return points;
    }

    private void addCandidate(List<LocalDate> candidateDates, LocalDateTime timestamp) {
        if (timestamp != null) {
            candidateDates.add(timestamp.toLocalDate());
        }
    }

    private Map<LocalDate, Long> toLongMap(List<DailyLongMetricDTO> metrics) {
        Map<LocalDate, Long> points = new LinkedHashMap<>();
        for (DailyLongMetricDTO metric : metrics) {
            LocalDate date = parseDate(metric.getDate());
            if (date != null) {
                points.put(date, defaultLong(metric.getValue()));
            }
        }
        return points;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private Long defaultLong(Long value) {
        return value != null ? value : 0L;
    }

    private Double defaultDouble(Double value) {
        return value != null ? value : 0.0;
    }

    private Double calculateSurvivalRate(long activePopulation, long initialPopulation) {
        if (initialPopulation <= 0) {
            return 0.0;
        }

        return Math.max(0.0, Math.min(100.0,
                Math.round((activePopulation * 10000.0) / initialPopulation) / 100.0
        ));
    }

    private enum TrendRange {
        LAST_7_DAYS,
        LAST_30_DAYS,
        YEAR_TO_DATE,
        ALL_TIME;

        private static TrendRange from(String value) {
            String normalized = value == null ? DEFAULT_RANGE : value.trim().toLowerCase();
            return switch (normalized) {
                case "30d", "30", "last_30_days", "last30days" -> LAST_30_DAYS;
                case "ytd", "year_to_date", "year-to-date" -> YEAR_TO_DATE;
                case "all", "all_time", "alltime" -> ALL_TIME;
                default -> LAST_7_DAYS;
            };
        }
    }

    private static final class BusinessTrendAccumulator {
        private double totalRevenue;
        private long mortalityCount;
        private long currentStock;

        public double getTotalRevenue() {
            return totalRevenue;
        }

        public void setTotalRevenue(double totalRevenue) {
            this.totalRevenue = totalRevenue;
        }

        public long getMortalityCount() {
            return mortalityCount;
        }

        public void addMortalityCount(long mortalityCount) {
            this.mortalityCount += mortalityCount;
        }

        public long getCurrentStock() {
            return currentStock;
        }

        public void setCurrentStock(long currentStock) {
            this.currentStock = currentStock;
        }
    }

    private static final class ResourceEfficiencyAccumulator {
        private double feedConsumed;
        private double survivalRate;
        private long activePopulation;

        public double getFeedConsumed() {
            return feedConsumed;
        }

        public void setFeedConsumed(double feedConsumed) {
            this.feedConsumed = feedConsumed;
        }

        public double getSurvivalRate() {
            return survivalRate;
        }

        public void setSurvivalRate(double survivalRate) {
            this.survivalRate = survivalRate;
        }

        public long getActivePopulation() {
            return activePopulation;
        }

        public void setActivePopulation(long activePopulation) {
            this.activePopulation = activePopulation;
        }
    }
}
