package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.CorrectionRequest;
import com.authapp.dto.DashboardActionRequest;
import com.authapp.dto.DashboardActionResponse;
import com.authapp.entity.Event;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.DashboardService;
import com.authapp.service.EventCorrectionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;

/** Canonical command API for field operations. */
@RestController
@RequestMapping("/api/v1/operations")
@RequiredArgsConstructor
public class VersionedOperationController {

    private final DashboardService dashboardService;
    private final EventCorrectionService eventCorrectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<DashboardActionResponse>> createOperation(
            @Valid @RequestBody DashboardActionRequest requestBody,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        if (requestBody.getOperationId() == null || requestBody.getOperationId().isBlank()) {
            requestBody.setOperationId(request.getHeader("Idempotency-Key"));
        }
        DashboardActionResponse response = dashboardService.logAction(
                userId,
                requestBody,
                request.getRemoteAddr()
        );
        return ResponseEntity.ok(ApiResponse.success("Operation recorded successfully.", response));
    }

    @PostMapping("/{eventId}/correction")
    public ResponseEntity<ApiResponse<DashboardActionResponse>> correctOperation(
            @PathVariable Long eventId,
            @Valid @RequestBody CorrectionRequest requestBody,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        if (requestBody.getOperationId() == null || requestBody.getOperationId().isBlank()) {
            requestBody.setOperationId(request.getHeader("Idempotency-Key"));
        }

        Event corrected = eventCorrectionService.correctEvent(
                eventId,
                userId,
                requestBody.getReason(),
                requestBody.getOperationId(),
                request.getRemoteAddr()
        );

        DashboardActionResponse response = DashboardActionResponse.builder()
                .eventId(corrected.getId())
                .actionType(corrected.getEventType().getCode())
                .batchId(corrected.getBatch().getId())
                .batchName(corrected.getBatch().getName())
                .quantity(corrected.getQuantity())
                .measuredQuantity(corrected.getMeasuredQuantity())
                .updatedCurrentCount(corrected.getBatch().getCurrentCount())
                .timestamp(corrected.getCreatedAt())
                .operationId(corrected.getIdempotencyKey())
                .status(corrected.getStatus())
                .correctionOfId(corrected.getCorrectionOf() != null ? corrected.getCorrectionOf().getId() : null)
                .build();

        return ResponseEntity.ok(ApiResponse.success("Operation corrected successfully.", response));
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        throw new AccessDeniedException("Permission denied.");
    }
}
