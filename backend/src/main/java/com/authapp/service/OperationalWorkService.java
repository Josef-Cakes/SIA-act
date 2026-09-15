package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.AlertResponse;
import com.authapp.dto.CreateAlertRequest;
import com.authapp.dto.CreateTaskRequest;
import com.authapp.dto.TaskResponse;
import com.authapp.entity.Batch;
import com.authapp.entity.FarmTask;
import com.authapp.entity.OperationalAlert;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.FarmTaskRepository;
import com.authapp.repository.OperationalAlertRepository;
import com.authapp.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Persistent operational work layer. It replaces demo task/alert payloads
 * with records that have ownership, lifecycle, and audit context.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class OperationalWorkService {

    private static final String COMPLETED = "COMPLETED";
    private static final String RESOLVED = "RESOLVED";

    private final FarmTaskRepository taskRepository;
    private final OperationalAlertRepository alertRepository;
    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final EventLogger eventLogger;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'tasks-user-' + #userId")
    public List<TaskResponse> getTasksForUser(Long userId) {
        User user = requireUser(userId);
        List<FarmTask> tasks = isAdmin(user)
                ? taskRepository.findAllByOrderByDueAtAscCreatedAtDesc()
                : taskRepository.findByAssignedUserIdOrderByDueAtAscCreatedAtDesc(userId);
        return tasks.stream().map(this::toTaskResponse).toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'alerts-user-' + #userId")
    public List<AlertResponse> getAlertsForUser(Long userId) {
        User user = requireUser(userId);
        List<OperationalAlert> alerts = isAdmin(user)
                ? alertRepository.findAllByStatusNotOrderByDueAtAscCreatedAtDesc(RESOLVED)
                : alertRepository.findByAssignedUserIdAndStatusNotOrderByDueAtAscCreatedAtDesc(userId, RESOLVED);
        return alerts.stream().map(this::toAlertResponse).toList();
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public TaskResponse updateTaskStatus(Long userId, Long taskId, String requestedStatus, String ipAddress) {
        User actor = requireUser(userId);
        FarmTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found."));
        ensureCanManageTask(actor, task);

        String status = normalizeStatus(requestedStatus, "PENDING", "IN_PROGRESS", COMPLETED, "BLOCKED");
        task.setStatus(status);
        task.setCompletedAt(COMPLETED.equals(status) ? LocalDateTime.now() : null);
        FarmTask saved = taskRepository.save(task);
        eventLogger.logActivity(userId, "TASK_STATUS_UPDATED: " + taskId + " -> " + status, task.getBatch() != null ? task.getBatch().getId() : null, ipAddress);
        return toTaskResponse(saved);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public AlertResponse acknowledgeAlert(Long userId, Long alertId, String ipAddress) {
        User actor = requireUser(userId);
        OperationalAlert alert = requireAlert(alertId);
        ensureCanManageAlert(actor, alert);
        if (RESOLVED.equalsIgnoreCase(alert.getStatus())) {
            throw new IllegalArgumentException("Resolved alerts cannot be acknowledged.");
        }
        alert.setStatus("ACKNOWLEDGED");
        if (alert.getAcknowledgedAt() == null) {
            alert.setAcknowledgedAt(LocalDateTime.now());
        }
        OperationalAlert saved = alertRepository.save(alert);
        eventLogger.logActivity(userId, "ALERT_ACKNOWLEDGED: " + alertId, alert.getBatch() != null ? alert.getBatch().getId() : null, ipAddress);
        return toAlertResponse(saved);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public AlertResponse resolveAlert(Long userId, Long alertId, String resolutionNote, String ipAddress) {
        User actor = requireUser(userId);
        OperationalAlert alert = requireAlert(alertId);
        ensureCanManageAlert(actor, alert);
        String note = resolutionNote == null ? "" : resolutionNote.trim();
        if (note.isBlank()) {
            throw new IllegalArgumentException("A resolution note is required.");
        }
        alert.setStatus(RESOLVED);
        alert.setAcknowledgedAt(alert.getAcknowledgedAt() == null ? LocalDateTime.now() : alert.getAcknowledgedAt());
        alert.setResolvedAt(LocalDateTime.now());
        alert.setResolutionNote(limit(note, 500));
        OperationalAlert saved = alertRepository.save(alert);
        eventLogger.logActivity(userId, "ALERT_RESOLVED: " + alertId, alert.getBatch() != null ? alert.getBatch().getId() : null, ipAddress);
        return toAlertResponse(saved);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public TaskResponse createTask(Long adminUserId, CreateTaskRequest request, String ipAddress) {
        User creator = requireAdmin(adminUserId);
        User assignee = resolveAssignee(request.getAssignedUserId());
        Batch batch = resolveBatch(request.getBatchId());
        String priority = normalizeStatus(request.getPriority(), "LOW", "MEDIUM", "HIGH", "CRITICAL");

        FarmTask task = FarmTask.builder()
                .taskKey("TASK-" + UUID.randomUUID())
                .title(limit(request.getTitle().trim(), 120))
                .description(clean(request.getDescription(), 500))
                .locationLabel(clean(request.getLocationLabel(), 120))
                .priority(priority)
                .dueAt(request.getDueAt())
                .assignedUser(assignee)
                .batch(batch)
                .createdBy(creator)
                .build();
        FarmTask saved = taskRepository.save(task);
        eventLogger.logActivity(adminUserId, "TASK_CREATED: " + saved.getTitle(), batch != null ? batch.getId() : null, ipAddress);
        return toTaskResponse(saved);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public AlertResponse createAlert(Long adminUserId, CreateAlertRequest request, String ipAddress) {
        User creator = requireAdmin(adminUserId);
        User assignee = resolveAssignee(request.getAssignedUserId());
        Batch batch = resolveBatch(request.getBatchId());
        String severity = normalizeStatus(request.getSeverity(), "INFO", "WARNING", "CRITICAL");

        OperationalAlert alert = OperationalAlert.builder()
                .ruleCode(limit(request.getRuleCode().trim().toUpperCase(Locale.ROOT), 80))
                .message(limit(request.getMessage().trim(), 500))
                .severity(severity)
                .dueAt(request.getDueAt())
                .assignedUser(assignee)
                .batch(batch)
                .createdBy(creator)
                .build();
        OperationalAlert saved = alertRepository.save(alert);
        eventLogger.logActivity(adminUserId, "ALERT_CREATED: " + saved.getRuleCode(), batch != null ? batch.getId() : null, ipAddress);
        return toAlertResponse(saved);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
    }

    private User requireAdmin(Long userId) {
        User user = requireUser(userId);
        if (!isAdmin(user)) {
            throw new AccessDeniedException("Administrator permission is required.");
        }
        return user;
    }

    private boolean isAdmin(User user) {
        return user.getRole() == Role.ROLE_ADMIN;
    }

    private User resolveAssignee(Long userId) {
        if (userId == null) {
            return null;
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Assigned user not found."));
    }

    private Batch resolveBatch(Long batchId) {
        if (batchId == null) {
            return null;
        }
        return batchRepository.findByIdWithUserAndLivestock(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found."));
    }

    private FarmTask requireTask(Long taskId) {
        return taskRepository.findById(taskId)
                .orElseThrow(() -> new EntityNotFoundException("Task not found."));
    }

    private OperationalAlert requireAlert(Long alertId) {
        return alertRepository.findById(alertId)
                .orElseThrow(() -> new EntityNotFoundException("Alert not found."));
    }

    private void ensureCanManageTask(User actor, FarmTask task) {
        if (!isAdmin(actor)
                && (task.getAssignedUser() == null || !actor.getId().equals(task.getAssignedUser().getId()))) {
            throw new AccessDeniedException("This task is not assigned to you.");
        }
    }

    private void ensureCanManageAlert(User actor, OperationalAlert alert) {
        if (!isAdmin(actor)
                && (alert.getAssignedUser() == null || !actor.getId().equals(alert.getAssignedUser().getId()))) {
            throw new AccessDeniedException("This alert is not assigned to you.");
        }
    }

    private TaskResponse toTaskResponse(FarmTask task) {
        return TaskResponse.builder()
                .id(task.getId())
                .taskKey(task.getTaskKey())
                .title(task.getTitle())
                .description(task.getDescription())
                .locationLabel(task.getLocationLabel())
                .status(task.getStatus())
                .priority(task.getPriority())
                .dueAt(task.getDueAt())
                .completedAt(task.getCompletedAt())
                .assignedUserId(task.getAssignedUser() != null ? task.getAssignedUser().getId() : null)
                .batchId(task.getBatch() != null ? task.getBatch().getId() : null)
                .build();
    }

    private AlertResponse toAlertResponse(OperationalAlert alert) {
        return AlertResponse.builder()
                .id(alert.getId())
                .ruleCode(alert.getRuleCode())
                .message(alert.getMessage())
                .severity(alert.getSeverity())
                .status(alert.getStatus())
                .dueAt(alert.getDueAt())
                .createdAt(alert.getCreatedAt())
                .acknowledgedAt(alert.getAcknowledgedAt())
                .resolvedAt(alert.getResolvedAt())
                .resolutionNote(alert.getResolutionNote())
                .assignedUserId(alert.getAssignedUser() != null ? alert.getAssignedUser().getId() : null)
                .batchId(alert.getBatch() != null ? alert.getBatch().getId() : null)
                .build();
    }

    private String normalizeStatus(String value, String... allowed) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        for (String candidate : allowed) {
            if (candidate.equals(normalized)) {
                return normalized;
            }
        }
        throw new IllegalArgumentException("Invalid value: " + value + ". Allowed values: " + String.join(", ", allowed));
    }

    private String clean(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return limit(value.trim(), maxLength);
    }

    private String limit(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
