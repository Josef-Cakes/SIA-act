package com.authapp.controller;

import com.authapp.cache.CacheNames;
import com.authapp.dto.ApiResponse;
import com.authapp.dto.AlertResponse;
import com.authapp.dto.TaskResponse;
import com.authapp.entity.ActivityLog;
import com.authapp.entity.Batch;
import com.authapp.entity.User;
import com.authapp.repository.ActivityLogRepository;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.UserRepository;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.OperationalWorkService;
import jakarta.validation.constraints.NotBlank;
import jakarta.servlet.http.HttpServletRequest;
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
@PreAuthorize("hasAuthority('ROLE_HANDLER')")
@RequiredArgsConstructor
public class HandlerController {

    private final ActivityLogRepository activityLogRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final OperationalWorkService operationalWorkService;

    /**
     * GET /api/handler/tasks
     * Returns assigned tasks for the handler.
     */
    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(Authentication auth, HttpServletRequest request) {
        Long userId = requireAuthenticatedUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Assigned tasks retrieved.", operationalWorkService.getTasksForUser(userId)));
    }

    /**
     * PUT /api/handler/tasks/{taskId}/status
     * Updates task status.
     */
    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(
            @PathVariable String taskId,
            @RequestParam String status,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        try {
            TaskResponse updated = operationalWorkService.updateTaskStatus(
                    userId,
                    Long.valueOf(taskId),
                    status,
                    resolveClientIp(request)
            );
            return ResponseEntity.ok(ApiResponse.success("Task updated successfully", updated));
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(ApiResponse.<TaskResponse>error("Task ID must be numeric."));
        }
    }

    /**
     * GET /api/handler/alerts
     * Returns active alerts for handlers.
     */
    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getAlerts(HttpServletRequest request) {
        Long userId = requireAuthenticatedUserId(request);
        return ResponseEntity.ok(ApiResponse.success("Assigned alerts retrieved.", operationalWorkService.getAlertsForUser(userId)));
    }

    /**
     * POST /api/handler/logs
     * Logs handler activity.
     */
    @PostMapping("/logs")
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> logActivity(
            @RequestBody CreateHandlerLogRequest logData,
            Authentication auth,
            HttpServletRequest request
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
                .ipAddress(resolveClientIp(request))
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

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        throw new org.springframework.security.access.AccessDeniedException("Permission denied.");
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

    private String resolveClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
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
