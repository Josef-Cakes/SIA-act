package com.authapp.controller;

import com.authapp.dto.AlertResponse;
import com.authapp.dto.ApiResponse;
import com.authapp.dto.CreateAlertRequest;
import com.authapp.dto.CreateTaskRequest;
import com.authapp.dto.TaskResponse;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.OperationalWorkService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Management APIs for work assignment and actionable exceptions. */
@RestController
@RequestMapping("/api/v1/operations-management")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class OperationsManagementController {

    private final OperationalWorkService operationalWorkService;

    @GetMapping("/tasks")
    public ResponseEntity<ApiResponse<List<TaskResponse>>> getTasks(HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Operational tasks retrieved.",
                operationalWorkService.getTasksForUser(requireAuthenticatedUserId(request))
        ));
    }

    @PostMapping("/tasks")
    public ResponseEntity<ApiResponse<TaskResponse>> createTask(
            @Valid @RequestBody CreateTaskRequest requestBody,
            HttpServletRequest request
    ) {
        TaskResponse task = operationalWorkService.createTask(
                requireAuthenticatedUserId(request),
                requestBody,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operational task created.", task));
    }

    @PutMapping("/tasks/{taskId}/status")
    public ResponseEntity<ApiResponse<TaskResponse>> updateTaskStatus(
            @PathVariable Long taskId,
            @RequestParam String status,
            HttpServletRequest request
    ) {
        TaskResponse task = operationalWorkService.updateTaskStatus(
                requireAuthenticatedUserId(request),
                taskId,
                status,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operational task updated.", task));
    }

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getAlerts(HttpServletRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Operational alerts retrieved.",
                operationalWorkService.getAlertsForUser(requireAuthenticatedUserId(request))
        ));
    }

    @PostMapping("/alerts")
    public ResponseEntity<ApiResponse<AlertResponse>> createAlert(
            @Valid @RequestBody CreateAlertRequest requestBody,
            HttpServletRequest request
    ) {
        AlertResponse alert = operationalWorkService.createAlert(
                requireAuthenticatedUserId(request),
                requestBody,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operational alert created.", alert));
    }

    @PutMapping("/alerts/{alertId}/acknowledge")
    public ResponseEntity<ApiResponse<AlertResponse>> acknowledgeAlert(
            @PathVariable Long alertId,
            HttpServletRequest request
    ) {
        AlertResponse alert = operationalWorkService.acknowledgeAlert(
                requireAuthenticatedUserId(request),
                alertId,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operational alert acknowledged.", alert));
    }

    @PutMapping("/alerts/{alertId}/resolve")
    public ResponseEntity<ApiResponse<AlertResponse>> resolveAlert(
            @PathVariable Long alertId,
            @RequestParam String resolutionNote,
            HttpServletRequest request
    ) {
        AlertResponse alert = operationalWorkService.resolveAlert(
                requireAuthenticatedUserId(request),
                alertId,
                resolutionNote,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operational alert resolved.", alert));
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        throw new AccessDeniedException("Permission denied.");
    }
}
