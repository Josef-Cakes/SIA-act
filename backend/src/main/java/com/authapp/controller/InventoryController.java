package com.authapp.controller;

import com.authapp.dto.AdminInventoryBatchDTO;
import com.authapp.dto.ApiResponse;
import com.authapp.dto.InventorySummaryResponseDTO;
import com.authapp.dto.LivestockSummaryDTO;
import com.authapp.dto.UpdateBatchAssignmentRequest;
import com.authapp.dto.UpdateLivestockRequest;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.AdminManagementService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class InventoryController {

    private final AdminManagementService adminManagementService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<InventorySummaryResponseDTO>> getInventorySummary() {
        InventorySummaryResponseDTO summary = adminManagementService.getInventorySummary();
        return ResponseEntity.ok(ApiResponse.success("Inventory summary retrieved successfully.", summary));
    }

    @GetMapping("/summary/{livestockId}/batches")
    public ResponseEntity<ApiResponse<List<AdminInventoryBatchDTO>>> getActiveBatchesForLivestock(
            @PathVariable Long livestockId
    ) {
        List<AdminInventoryBatchDTO> batches = adminManagementService.getActiveBatchesForLivestock(livestockId);
        return ResponseEntity.ok(ApiResponse.success("Active batches retrieved successfully.", batches));
    }

    @PutMapping("/batches/{batchId}/archive")
    public ResponseEntity<ApiResponse<AdminInventoryBatchDTO>> archiveBatch(
            @PathVariable Long batchId,
            HttpServletRequest request
    ) {
        AdminInventoryBatchDTO batch = adminManagementService.archiveBatch(
                batchId,
                requireAuthenticatedUserId(request),
                resolveClientIp(request)
        );
        return ResponseEntity.ok(ApiResponse.success("Batch archived successfully.", batch));
    }

    @PutMapping("/batches/{batchId}/assignment")
    public ResponseEntity<ApiResponse<AdminInventoryBatchDTO>> updateBatchAssignment(
            @PathVariable Long batchId,
            @Valid @RequestBody UpdateBatchAssignmentRequest requestBody,
            HttpServletRequest request
    ) {
        AdminInventoryBatchDTO batch = adminManagementService.updateBatchAssignment(
                batchId,
                requestBody,
                requireAuthenticatedUserId(request),
                resolveClientIp(request)
        );
        return ResponseEntity.ok(ApiResponse.success("Batch assignment updated successfully.", batch));
    }

    @PutMapping("/species/{livestockId}")
    public ResponseEntity<ApiResponse<LivestockSummaryDTO>> updateLivestockType(
            @PathVariable Long livestockId,
            @Valid @RequestBody UpdateLivestockRequest requestBody,
            HttpServletRequest request
    ) {
        LivestockSummaryDTO livestock = adminManagementService.updateLivestockType(
                livestockId,
                requestBody,
                requireAuthenticatedUserId(request),
                resolveClientIp(request)
        );
        return ResponseEntity.ok(ApiResponse.success("Livestock species updated successfully.", livestock));
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
