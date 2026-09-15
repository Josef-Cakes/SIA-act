package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.entity.ActivityLog;
import com.authapp.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventLogger {

    private final ActivityLogRepository activityLogRepository;

    @Transactional
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public void logActivity(Long userId, String action, Long targetId, String ipAddress) {
        if (userId == null || action == null || action.isBlank()) {
            return;
        }

        try {
            ActivityLog activityLog = ActivityLog.builder()
                    .userId(userId)
                    .action(action)
                    .targetId(targetId)
                    .ipAddress(ipAddress)
                    .build();

            activityLogRepository.save(activityLog);
        } catch (Exception ex) {
            log.warn("Failed to persist activity log for user {} and action {}", userId, action, ex);
        }
    }
}
