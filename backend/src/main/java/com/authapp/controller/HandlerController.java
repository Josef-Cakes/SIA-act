package com.authapp.controller;

import com.authapp.cache.CacheNames;
import com.authapp.dto.ApiResponse;
import com.authapp.entity.ActivityLog;
import com.authapp.entity.Batch;
import com.authapp.entity.User;
import com.authapp.repository.ActivityLogRepository;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.UserRepository;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * HandlerController - ROLE_HANDLER only endpoints.
 * These endpoints are protected by SecurityConfig and only accessible to users with ROLE_HANDLER.
 */
@RestController
@RequestMapping("/api/handler")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasAuthority('ROLE_HANDLER')")
@RequiredArgsConstructor
public class HandlerController {

    private final ActivityLogRepository activityLogRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;

    /**
     * GET /api/handler/tasks
     * Returns assigned tasks for the handler.
     */
    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTasks(Authentication auth) {
        String username = auth.getName();

        List<Map<String, Object>> tasks = Arrays.asList(
            createTask("T001", "Morning Feeding - Sector A", "Barn A1-A3", "6:00 AM", "completed", "high"),
            createTask("T002", "Water Level Check", "All Sectors", "8:00 AM", "in_progress", "medium"),
            createTask("T003", "Health Inspection", "Quarantine Area", "10:00 AM", "pending", "high"),
            createTask("T004", "Afternoon Feeding - Sector B", "Barn B1-B4", "2:00 PM", "pending", "medium"),
            createTask("T005", "Equipment Maintenance", "Workshop", "4:00 PM", "pending", "low")
        );

        return ResponseEntity.ok(ApiResponse.success("Tasks retrieved for handler: " + username, tasks));
    }

    /**
     * PUT /api/handler/tasks/{taskId}/status
     * Updates task status.
     */
    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<ApiResponse<String>> updateTaskStatus(
            @PathVariable String taskId,
            @RequestParam String status,
            Authentication auth
    ) {
        String username = auth.getName();

        // Validate status
        List<String> validStatuses = Arrays.asList("pending", "in_progress", "completed");
        if (!validStatuses.contains(status)) {
            return ResponseEntity.status(400).body(ApiResponse.error("Invalid status: " + status));
        }

        String message = String.format("Task %s status updated to '%s' by handler: %s", taskId, status, username);
        return ResponseEntity.ok(ApiResponse.success("Task updated successfully", message));
    }

    /**
     * GET /api/handler/alerts
     * Returns active alerts for handlers.
     */
    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAlerts() {
        List<Map<String, Object>> alerts = Arrays.asList(
            createAlert("A001", "Temperature spike detected in Barn 3", "12 min ago", "warning"),
            createAlert("A002", "Low water level in Tank 2", "1 hour ago", "alert"),
            createAlert("A003", "Scheduled maintenance reminder", "2 hours ago", "info"),
            createAlert("A004", "Feed inventory running low", "3 hours ago", "warning")
        );

        return ResponseEntity.ok(ApiResponse.success("Active alerts retrieved", alerts));
    }

    /**
     * POST /api/handler/logs
     * Logs handler activity.
     */
    @PostMapping("/logs")
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> logActivity(
            @RequestBody CreateHandlerLogRequest logData,
            Authentication auth
    ) {
        User user = getAuthenticatedUser(auth);
        String action = logData.getAction().trim();
        String detail = logData.getDetail() != null && !logData.getDetail().isBlank()
                ? " | " + logData.getDetail().trim()
                : "";

        ActivityLog savedLog = activityLogRepository.save(ActivityLog.builder()
                .userId(user.getId())
                .action(truncateAction(action + detail))
                .targetId(logData.getTargetId())
                .ipAddress(logData.getIpAddress())
                .build());

        Map<String, Object> payload = new HashMap<>();
        payload.put("id", savedLog.getId());
        payload.put("action", savedLog.getAction());
        payload.put("targetId", savedLog.getTargetId());
        payload.put("timestamp", savedLog.getTimestamp().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        return ResponseEntity.ok(ApiResponse.success("Activity logged successfully", payload));
    }

    /**
     * GET /api/handler/stats
     * Returns handler statistics (tasks completed, hours worked, etc.).
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHandlerStats(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        long activeBatches = defaultLong(batchRepository.countActiveBatchesByUserId(user.getId()));
        long totalLivestock = defaultLong(batchRepository.sumCurrentCountByUserId(user.getId()));
        long logsToday = activityLogRepository.countByUserIdAndTimestampAfter(user.getId(), LocalDateTime.now().minusHours(24));

        Map<String, Object> stats = new HashMap<>();
        stats.put("username", user.getUsername());
        stats.put("handlerName", user.getFullName());
        stats.put("activeBatches", activeBatches);
        stats.put("totalLivestock", totalLivestock);
        stats.put("logsToday", logsToday);
        stats.put("recentActivity", activityLogRepository.findByUserIdOrderByTimestampDesc(user.getId(), PageRequest.of(0, 5)).size());

        return ResponseEntity.ok(ApiResponse.success("Handler statistics retrieved", stats));
    }

    /**
     * GET /api/handler/livestock
     * Returns livestock data assigned to the handler.
     */
    @GetMapping("/livestock")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLivestock(Authentication auth) {
        User user = getAuthenticatedUser(auth);
        List<Map<String, Object>> livestock = batchRepository.findWithLivestockByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toLivestockPayload)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Livestock data retrieved", livestock));
    }

    // =============================================
    // HELPER METHODS
    // =============================================

    private Map<String, Object> createTask(String id, String title, String location, String time, String status, String priority) {
        Map<String, Object> task = new HashMap<>();
        task.put("id", id);
        task.put("title", title);
        task.put("location", location);
        task.put("time", time);
        task.put("status", status);
        task.put("priority", priority);
        return task;
    }

    private Map<String, Object> createAlert(String id, String message, String time, String severity) {
        Map<String, Object> alert = new HashMap<>();
        alert.put("id", id);
        alert.put("message", message);
        alert.put("time", time);
        alert.put("severity", severity);
        return alert;
    }

    private Map<String, Object> toLivestockPayload(Batch batch) {
        Map<String, Object> livestock = new HashMap<>();
        livestock.put("id", batch.getId());
        livestock.put("location", batch.getName());
        livestock.put("type", batch.getLivestock().getType());
        livestock.put("count", batch.getCurrentCount());
        livestock.put("status", batch.getStatus());
        livestock.put("breed", batch.getBreed());
        livestock.put("arrivalDate", batch.getArrivalDate());
        return livestock;
    }

    private User getAuthenticatedUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    private long defaultLong(Long value) {
        return value != null ? value : 0L;
    }

    private String truncateAction(String action) {
        if (action == null) {
            return null;
        }

        return action.length() <= 100 ? action : action.substring(0, 100);
    }

    @Data
    public static class CreateHandlerLogRequest {
        @NotBlank
        private String action;
        private String detail;
        private Long targetId;
        private String ipAddress;
    }
}
