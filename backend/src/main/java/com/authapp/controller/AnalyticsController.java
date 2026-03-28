package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.BusinessTrendPointDTO;
import com.authapp.dto.ResourceEfficiencyPointDTO;
import com.authapp.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/business-trends")
    public ResponseEntity<ApiResponse<List<BusinessTrendPointDTO>>> getBusinessTrends(
            @RequestParam(defaultValue = "7d") String range
    ) {
        List<BusinessTrendPointDTO> trends = analyticsService.getBusinessTrends(range);
        return ResponseEntity.ok(ApiResponse.success("Business trends retrieved successfully.", trends));
    }

    @GetMapping("/resource-efficiency")
    public ResponseEntity<ApiResponse<List<ResourceEfficiencyPointDTO>>> getResourceEfficiency(
            @RequestParam Long livestockId,
            @RequestParam(defaultValue = "7d") String range
    ) {
        List<ResourceEfficiencyPointDTO> points = analyticsService.getResourceEfficiency(livestockId, range);
        return ResponseEntity.ok(ApiResponse.success("Resource efficiency analytics retrieved successfully.", points));
    }
}
