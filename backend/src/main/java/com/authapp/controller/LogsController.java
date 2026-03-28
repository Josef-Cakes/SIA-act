package com.authapp.controller;

import com.authapp.dto.AdminActivityLogDTO;
import com.authapp.dto.AdminHandlerSummaryDTO;
import com.authapp.dto.ApiResponse;
import com.authapp.dto.HandlerActivityLogDTO;
import com.authapp.service.AdminManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class LogsController {

    private final AdminManagementService adminManagementService;

    @GetMapping("/all")
    public ResponseEntity<ApiResponse<List<AdminActivityLogDTO>>> getAllLogs(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "20") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<AdminActivityLogDTO> logs = adminManagementService.getActivityLogs(userId, safeLimit);
        return ResponseEntity.ok(ApiResponse.success("Activity logs retrieved successfully.", logs));
    }

    @GetMapping("/handlers")
    public ResponseEntity<ApiResponse<List<AdminHandlerSummaryDTO>>> getHandlers() {
        List<AdminHandlerSummaryDTO> handlers = adminManagementService.getHandlerSummaries();
        return ResponseEntity.ok(ApiResponse.success("Handler summaries retrieved successfully.", handlers));
    }

    @GetMapping("/handler/{handlerId}")
    public ResponseEntity<ApiResponse<List<HandlerActivityLogDTO>>> getHandlerLogs(
            @PathVariable Long handlerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long livestockId
    ) {
        List<HandlerActivityLogDTO> logs = adminManagementService.getHandlerActivityLogs(
                handlerId,
                startDate,
                endDate,
                livestockId
        );
        return ResponseEntity.ok(ApiResponse.success("Handler activity logs retrieved successfully.", logs));
    }
}
