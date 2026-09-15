package com.authapp.controller;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.DashboardBatchOptionDTO;
import com.authapp.entity.Batch;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.UserRepository;
import com.authapp.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Resolves durable printed batch labels without exposing unrelated batches. */
@RestController
@RequestMapping("/api/v1/batches")
@RequiredArgsConstructor
public class BatchCodeController {

    private final BatchRepository batchRepository;
    private final UserRepository userRepository;

    @GetMapping("/resolve")
    public ResponseEntity<ApiResponse<DashboardBatchOptionDTO>> resolve(
            @RequestParam String code,
            HttpServletRequest request
    ) {
        Long userId = requireAuthenticatedUserId(request);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
        String normalizedCode = code == null ? "" : code.trim();
        if (normalizedCode.isBlank()) {
            throw new IllegalArgumentException("Batch QR code is required.");
        }

        Batch batch = batchRepository.findByQrCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Batch QR code was not found."));
        boolean admin = user.getRole() == Role.ROLE_ADMIN;
        if (!admin && (batch.getUser() == null || !userId.equals(batch.getUser().getId()))) {
            throw new AccessDeniedException("This batch is not assigned to you.");
        }
        if (batch.getCurrentCount() == null || batch.getCurrentCount() <= 0
                || "ARCHIVED".equalsIgnoreCase(batch.getStatus())) {
            throw new IllegalArgumentException("This batch is no longer active.");
        }

        DashboardBatchOptionDTO payload = new DashboardBatchOptionDTO(
                batch.getId(),
                batch.getName(),
                batch.getLivestock().getType(),
                batch.getCurrentCount(),
                batch.getQrCode()
        );
        return ResponseEntity.ok(ApiResponse.success("Batch QR code resolved.", payload));
    }

    private Long requireAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        throw new AccessDeniedException("Permission denied.");
    }
}
