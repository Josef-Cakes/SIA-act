package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.CreateBatchRequest;
import com.authapp.dto.CreateLivestockRequest;
import com.authapp.dto.DashboardActionRequest;
import com.authapp.dto.DashboardActionResponse;
import com.authapp.dto.DashboardRecentLogDTO;
import com.authapp.dto.DashboardStatsDTO;
import com.authapp.dto.InventoryBatchDTO;
import com.authapp.dto.LivestockSummaryDTO;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.DashboardService;
import com.authapp.service.InventoryManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;
    private final InventoryManagementService inventoryManagementService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardStatsDTO>> getDashboardStats(HttpServletRequest request) {
        Long userId = requireAuthenticatedUserId(request);
        DashboardStatsDTO stats = dashboardService.getDashboardStats(userId);
        return ResponseEntity.ok(ApiResponse.success("Dashboard statistics retrieved successfully.", stats));
    }

    @GetMapping("/recent-logs")
    public ResponseEntity<ApiResponse<List<DashboardRecentLogDTO>>> getRecentLogs(HttpServletRequest request) {
        Long userId = requireAuthenticatedUserId(request);
        List<DashboardRecentLogDTO> logs = dashboardService.getRecentLogs(userId);
        return ResponseEntity.ok(ApiResponse.success("Recent dashboard logs retrieved successfully.", logs));
    }

    @PostMapping("/log-action")
    public ResponseEntity<ApiResponse<DashboardActionResponse>> logAction(
            @Valid @RequestBody DashboardActionRequest requestBody,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        String ipAddress = resolveClientIp(request);

        DashboardActionResponse response = dashboardService.logAction(userId, requestBody, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Dashboard action logged successfully.", response));
    }

    @GetMapping("/livestock")
    public ResponseEntity<ApiResponse<List<LivestockSummaryDTO>>> getLivestockSummaries(HttpServletRequest request) {
        requireAuthenticatedUserId(request);
        List<LivestockSummaryDTO> livestock = inventoryManagementService.getLivestockSummaries();
        return ResponseEntity.ok(ApiResponse.success("Livestock inventory retrieved successfully.", livestock));
    }

    @GetMapping("/livestock/{livestockId}/batches")
    public ResponseEntity<ApiResponse<List<InventoryBatchDTO>>> getBatchesForLivestock(
            @PathVariable Long livestockId,
            HttpServletRequest request
    ) {
        requireAuthenticatedUserId(request);
        List<InventoryBatchDTO> batches = inventoryManagementService.getBatchesForLivestock(livestockId);
        return ResponseEntity.ok(ApiResponse.success("Batch inventory retrieved successfully.", batches));
    }

    @PostMapping("/livestock")
    public ResponseEntity<ApiResponse<LivestockSummaryDTO>> createLivestock(
            @Valid @RequestBody CreateLivestockRequest requestBody,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        LivestockSummaryDTO livestock = inventoryManagementService.createLivestock(
                userId,
                requestBody,
                resolveClientIp(request)
        );
        return ResponseEntity.ok(ApiResponse.success("Livestock species created successfully.", livestock));
    }

    @PostMapping("/batches")
    public ResponseEntity<ApiResponse<InventoryBatchDTO>> createBatch(
            @Valid @RequestBody CreateBatchRequest requestBody,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        InventoryBatchDTO batch = inventoryManagementService.createBatch(
                userId,
                requestBody,
                resolveClientIp(request)
        );
        return ResponseEntity.ok(ApiResponse.success("Batch created successfully.", batch));
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object attribute = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (attribute instanceof Long userId) {
            return userId;
        }

        throw new AccessDeniedException("Permission denied.");
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr();
    }
}
