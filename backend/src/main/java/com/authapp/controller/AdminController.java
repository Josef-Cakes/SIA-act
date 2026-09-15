package com.authapp.controller;

import com.authapp.cache.CacheNames;
import com.authapp.dto.ApiResponse;
import com.authapp.dto.AdminActivityLogDTO;
import com.authapp.dto.AdminUserDTO;
import com.authapp.dto.DashboardAnalyticsDTO;
import com.authapp.repository.ActivityLogRepository;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.OperationalAlertRepository;
import com.authapp.entity.User;
import com.authapp.repository.UserRepository;
import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.AdminManagementService;
import com.authapp.service.AnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.sql.SQLException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * AdminController - ROLE_ADMIN only endpoints.
 * These endpoints are protected by SecurityConfig and only accessible to users with ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final BatchRepository batchRepository;
    private final ActivityLogRepository activityLogRepository;
    private final OperationalAlertRepository operationalAlertRepository;
    private final AnalyticsService analyticsService;
    private final AdminManagementService adminManagementService;
    private final DataSource dataSource;

    @Value("${APP_VERSION:${spring.application.version:unknown}}")
    private String applicationVersion;

    @Value("${APP_ENV:${spring.profiles.active:unknown}}")
    private String environment;

    /**
     * GET /api/admin/dashboard
     * Returns admin dashboard statistics.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardStats() {
        Map<String, Object> stats = new HashMap<>();

        long totalUsers = userRepository.count();
        long adminCount = userRepository.countByRole(com.authapp.entity.Role.ROLE_ADMIN);
        long handlerCount = userRepository.countByRole(com.authapp.entity.Role.ROLE_HANDLER);

        stats.put("totalUsers", totalUsers);
        stats.put("adminCount", adminCount);
        stats.put("handlerCount", handlerCount);
        stats.put("totalLivestock", batchRepository.sumCurrentCount());
        // Feed efficiency is deliberately omitted until feed stock lots and
        // consumption units are available; returning a made-up percentage is
        // worse than exposing that the metric is not yet instrumented.
        stats.put("healthAlerts", operationalAlertRepository.countByStatusNot("RESOLVED"));

        return ResponseEntity.ok(ApiResponse.success("Dashboard statistics retrieved successfully", stats));
    }

    @GetMapping("/analytics/summary")
    public ResponseEntity<ApiResponse<DashboardAnalyticsDTO>> getAnalyticsSummary() {
        DashboardAnalyticsDTO analytics = analyticsService.getDashboardSummary();
        return ResponseEntity.ok(ApiResponse.success("Analytics summary retrieved successfully", analytics));
    }

    @GetMapping("/activity-feed")
    public ResponseEntity<ApiResponse<List<AdminActivityLogDTO>>> getActivityFeed() {
        List<AdminActivityLogDTO> logs = adminManagementService.getRecentActivityLogs();
        return ResponseEntity.ok(ApiResponse.success("Recent activity logs retrieved successfully", logs));
    }

    /**
     * GET /api/admin/handlers
     * Returns all users with ROLE_HANDLER.
     */
    @GetMapping("/handlers")
    public ResponseEntity<ApiResponse<List<AdminUserDTO>>> getAllHandlers() {
        List<User> handlers = userRepository.findByRole(com.authapp.entity.Role.ROLE_HANDLER);
        return ResponseEntity.ok(ApiResponse.success("Handlers retrieved successfully", handlers.stream()
                .map(this::toAdminUser)
                .toList()));
    }

    /**
     * GET /api/admin/users
     * Returns all users (admin-only access).
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<AdminUserDTO>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success("Users retrieved successfully", users.stream()
                .map(this::toAdminUser)
                .toList()));
    }

    /**
     * PUT /api/admin/users/{userId}/role
     * Updates a user's role (admin-only).
     */
    @PutMapping("/users/{userId}/role")
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ResponseEntity<ApiResponse<String>> updateUserRole(
            @PathVariable Long userId,
            @RequestParam String role
    ) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }

        try {
            com.authapp.entity.Role newRole = com.authapp.entity.Role.valueOf(role);
            user.setRole(newRole);
            userRepository.save(user);
            return ResponseEntity.ok(ApiResponse.success("Role updated successfully", "User role updated to " + newRole));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(ApiResponse.error("Invalid role: " + role));
        }
    }

    /**
     * DELETE /api/admin/users/{userId}
     * Deletes a user (admin-only).
     */
    @DeleteMapping("/users/{userId}")
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null) {
            return ResponseEntity.status(404).body(ApiResponse.error("User not found"));
        }

        // Prevent admin from deleting themselves
        if (user.getRole() == com.authapp.entity.Role.ROLE_ADMIN) {
            return ResponseEntity.status(403).body(ApiResponse.error("Cannot delete admin users"));
        }

        userRepository.delete(user);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", "User with ID " + userId + " has been removed"));
    }

    @DeleteMapping("/livestock/{livestockId}")
    public ResponseEntity<ApiResponse<String>> deleteLivestockSpecies(
            @PathVariable Long livestockId,
            HttpServletRequest request
    ) {
        Long adminUserId = requireAuthenticatedUserId(request);
        adminManagementService.deleteLivestockSpecies(livestockId, adminUserId, resolveClientIp(request));
        return ResponseEntity.ok(ApiResponse.success("Livestock species deleted successfully", "Species and associated batches were removed safely."));
    }

    /**
     * GET /api/admin/system-info
     * Returns system information (admin-only).
     */
    @GetMapping("/system-info")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemInfo() {
        Map<String, Object> systemInfo = new HashMap<>();
        systemInfo.put("serverVersion", applicationVersion);
        systemInfo.put("databaseStatus", databaseStatus());
        systemInfo.put("uptimeSeconds", ManagementFactory.getRuntimeMXBean().getUptime() / 1000L);
        systemInfo.put("environment", environment);

        return ResponseEntity.ok(ApiResponse.success("System information retrieved successfully", systemInfo));
    }

    private String databaseStatus() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(2) ? "UP" : "DOWN";
        } catch (SQLException ex) {
            return "DOWN";
        }
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object attribute = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (attribute instanceof Long userId) {
            return userId;
        }

        throw new org.springframework.security.access.AccessDeniedException("Permission denied.");
    }

    private AdminUserDTO toAdminUser(User user) {
        boolean hasProfileImage = user.getProfileImage() != null && user.getProfileImage().length > 0;
        return AdminUserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole() != null ? user.getRole().name() : null)
                .hasProfileImage(hasProfileImage)
                .build();
    }

    private String resolveClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
