package com.authapp.service;

import com.authapp.dto.DailyOperationsReportResponse;
import com.authapp.dto.OperationReportEntry;
import com.authapp.entity.Event;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.EventRepository;
import com.authapp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Builds reports from immutable events instead of dashboard counters. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperationsReportService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    public DailyOperationsReportResponse getDailyReport(Long userId, LocalDate date) {
        requireAdmin(userId);
        LocalDate reportDate = date == null ? LocalDate.now() : date;
        LocalDateTime from = reportDate.atStartOfDay();
        LocalDateTime to = reportDate.plusDays(1).atStartOfDay();
        List<Event> events = eventRepository.findForReportBetween(from, to);

        long headcountChange = events.stream()
                .mapToLong(this::quantityChange)
                .sum();
        BigDecimal feedKg = events.stream()
                .map(this::feedImpact)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OperationReportEntry> entries = events.stream()
                .map(this::toEntry)
                .toList();
        return DailyOperationsReportResponse.builder()
                .date(reportDate)
                .totalOperations(entries.size())
                .totalHeadcountChange(headcountChange)
                .totalFeedKg(feedKg)
                .entries(entries)
                .build();
    }

    public String getDailyCsv(Long userId, LocalDate date) {
        DailyOperationsReportResponse report = getDailyReport(userId, date);
        StringBuilder csv = new StringBuilder();
        csv.append("event_id,operation_id,status,action_type,batch_id,batch_name,quantity,quantity_change,measured_quantity,unit,correction_of_id,actor,recorded_at,remarks\n");
        for (OperationReportEntry entry : report.getEntries()) {
            csv.append(csvValue(entry.getEventId()))
                    .append(',').append(csvValue(entry.getOperationId()))
                    .append(',').append(csvValue(entry.getStatus()))
                    .append(',').append(csvValue(entry.getActionType()))
                    .append(',').append(csvValue(entry.getBatchId()))
                    .append(',').append(csvValue(entry.getBatchName()))
                    .append(',').append(csvValue(entry.getQuantity()))
                    .append(',').append(csvValue(entry.getQuantityChange()))
                    .append(',').append(csvValue(entry.getMeasuredQuantity()))
                    .append(',').append(csvValue(entry.getUnit()))
                    .append(',').append(csvValue(entry.getCorrectionOfId()))
                    .append(',').append(csvValue(entry.getActorUsername()))
                    .append(',').append(csvValue(entry.getRecordedAt()))
                    .append(',').append(csvValue(entry.getRemarks()))
                    .append('\n');
        }
        return csv.toString();
    }

    private OperationReportEntry toEntry(Event event) {
        return OperationReportEntry.builder()
                .eventId(event.getId())
                .operationId(event.getIdempotencyKey())
                .status(event.getStatus())
                .actionType(event.getEventType().getCode())
                .batchId(event.getBatch().getId())
                .batchName(event.getBatch().getName())
                .quantity(event.getQuantity())
                .quantityChange(event.getQuantityChange())
                .measuredQuantity(event.getMeasuredQuantity())
                .unit(event.getUnit())
                .correctionOfId(event.getCorrectionOf() != null ? event.getCorrectionOf().getId() : null)
                .actorUsername(event.getUser() != null ? event.getUser().getUsername() : null)
                .recordedAt(event.getCreatedAt())
                .remarks(event.getRemarks())
                .build();
    }

    private long quantityChange(Event event) {
        if (event.getQuantityChange() != null) {
            return event.getQuantityChange();
        }
        if (event.getEventType() != null
                && Boolean.TRUE.equals(event.getEventType().getAffectsCount())
                && event.getEventType().getCountSign() != null
                && event.getQuantity() != null) {
            return (long) event.getQuantity() * event.getEventType().getCountSign();
        }
        return 0L;
    }

    private BigDecimal feedImpact(Event event) {
        if (event.getMeasuredQuantity() == null) {
            return BigDecimal.ZERO;
        }
        if (event.getEventType() != null && "FEEDING".equalsIgnoreCase(event.getEventType().getCode())) {
            return event.getMeasuredQuantity();
        }
        if (event.getCorrectionOf() != null
                && event.getCorrectionOf().getEventType() != null
                && "FEEDING".equalsIgnoreCase(event.getCorrectionOf().getEventType().getCode())) {
            return event.getMeasuredQuantity().negate();
        }
        return BigDecimal.ZERO;
    }

    private void requireAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
        if (user.getRole() != Role.ROLE_ADMIN) {
            throw new AccessDeniedException("Administrator permission is required.");
        }
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }
        String text = String.valueOf(value);
        if (text.indexOf(',') >= 0 || text.indexOf('"') >= 0 || text.indexOf('\n') >= 0 || text.indexOf('\r') >= 0) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }
}
