package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.DailyOperationsReportResponse;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.OperationsReportService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

/** Admin-only ledger-backed daily reporting endpoints. */
@RestController
@RequestMapping("/api/v1/reports")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class OperationsReportController {

    private final OperationsReportService reportService;

    @GetMapping("/daily")
    public ResponseEntity<ApiResponse<DailyOperationsReportResponse>> daily(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request
    ) {
        DailyOperationsReportResponse report = reportService.getDailyReport(requireAuthenticatedUserId(request), date);
        return ResponseEntity.ok(ApiResponse.success("Daily operations report retrieved.", report));
    }

    @GetMapping(value = "/daily.csv", produces = "text/csv")
    public ResponseEntity<String> dailyCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request
    ) {
        LocalDate reportDate = date == null ? LocalDate.now() : date;
        String csv = reportService.getDailyCsv(requireAuthenticatedUserId(request), reportDate);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.setContentDisposition(ContentDisposition.attachment().filename("farm-operations-" + reportDate + ".csv").build());
        return ResponseEntity.ok().headers(headers).body(csv);
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        throw new AccessDeniedException("Permission denied.");
    }
}
