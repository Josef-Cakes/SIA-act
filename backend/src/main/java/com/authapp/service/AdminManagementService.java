package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.AdminHandlerSummaryDTO;
import com.authapp.dto.AdminInventoryBatchDTO;
import com.authapp.dto.AdminActivityLogDTO;
import com.authapp.dto.HandlerActivityLogDTO;
import com.authapp.dto.InventorySummaryResponseDTO;
import com.authapp.dto.LivestockSummaryDTO;
import com.authapp.dto.UpdateBatchAssignmentRequest;
import com.authapp.dto.UpdateLivestockRequest;
import com.authapp.entity.ActivityLog;
import com.authapp.entity.Batch;
import com.authapp.entity.Livestock;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.ActivityLogRepository;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.EventRepository;
import com.authapp.repository.LivestockRepository;
import com.authapp.repository.SaleRepository;
import com.authapp.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminManagementService {

    private static final int DEFAULT_ACTIVITY_LIMIT = 12;

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final LivestockRepository livestockRepository;
    private final BatchRepository batchRepository;
    private final EventRepository eventRepository;
    private final SaleRepository saleRepository;
    private final EventLogger eventLogger;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'admin-activity-feed'")
    public List<AdminActivityLogDTO> getRecentActivityLogs() {
        return loadActivityLogs(null, DEFAULT_ACTIVITY_LIMIT);
    }

    @Transactional(readOnly = true)
    @Cacheable(
            value = CacheNames.FARM_DATA,
            key = "'logs-all-' + (#userId == null ? 'all' : #userId) + '-' + (#limit < 1 ? 1 : (#limit > 100 ? 100 : #limit))"
    )
    public List<AdminActivityLogDTO> getActivityLogs(Long userId, int limit) {
        return loadActivityLogs(userId, limit);
    }

    @Transactional(readOnly = true)
    @Cacheable(
            value = CacheNames.FARM_DATA,
            key = "'handler-logs-' + #handlerId + '-' + (#startDate == null ? 'none' : #startDate.toString()) + '-' + (#endDate == null ? 'none' : #endDate.toString()) + '-' + (#livestockId == null ? 'all' : #livestockId)"
    )
    public List<HandlerActivityLogDTO> getHandlerActivityLogs(
            Long handlerId,
            LocalDate startDate,
            LocalDate endDate,
            Long livestockId
    ) {
        User handler = userRepository.findById(handlerId)
                .orElseThrow(() -> new EntityNotFoundException("Handler not found."));

        if (handler.getRole() != Role.ROLE_HANDLER) {
            throw new IllegalArgumentException("Selected user is not a handler.");
        }

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date.");
        }

        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.plusDays(1).atStartOfDay() : null;

        List<ActivityLog> logs = activityLogRepository.findFilteredByUserId(handlerId, startDateTime, endDateTime);
        Map<Long, Batch> batchesById = loadTargetBatches(logs);

        return logs.stream()
                .map(log -> mapHandlerActivityLog(log, handler, batchesById.get(log.getTargetId())))
                .filter(log -> livestockId == null || livestockId.equals(log.getLivestockId()))
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'handlers'")
    public List<AdminHandlerSummaryDTO> getHandlerSummaries() {
        List<User> handlers = userRepository.findByRoleOrderByFullNameAsc(Role.ROLE_HANDLER);
        List<Batch> activeBatches = batchRepository.findActiveWithUserAndLivestockOrderByCreatedAtDesc();

        Map<Long, List<Batch>> batchesByHandler = activeBatches.stream()
                .filter(batch -> batch.getUser() != null)
                .collect(Collectors.groupingBy(batch -> batch.getUser().getId()));

        return handlers.stream()
                .sorted(Comparator.comparing(this::resolveUserSortKey))
                .map(handler -> {
                    List<Batch> assignments = batchesByHandler.getOrDefault(handler.getId(), List.of());
                    long totalLivestock = assignments.stream()
                            .map(Batch::getCurrentCount)
                            .filter(count -> count != null)
                            .mapToLong(Integer::longValue)
                            .sum();

                    return new AdminHandlerSummaryDTO(
                            handler.getId(),
                            handler.getFullName(),
                            handler.getUsername(),
                            handler.getEmail(),
                            resolveActiveZone(assignments),
                            (long) assignments.size(),
                            totalLivestock
                    );
                })
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'inventory-summary'")
    public InventorySummaryResponseDTO getInventorySummary() {
        List<LivestockSummaryDTO> speciesBreakdown = livestockRepository.findLivestockSummaries();
        long totalLivestock = speciesBreakdown.stream()
                .map(LivestockSummaryDTO::getTotalCurrentCount)
                .filter(count -> count != null)
                .mapToLong(Long::longValue)
                .sum();
        long totalActiveBatches = speciesBreakdown.stream()
                .map(LivestockSummaryDTO::getBatchCount)
                .filter(count -> count != null)
                .mapToLong(Long::longValue)
                .sum();

        return new InventorySummaryResponseDTO(
                totalLivestock,
                (long) speciesBreakdown.size(),
                totalActiveBatches,
                speciesBreakdown
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'inventory-batches-' + #livestockId")
    public List<AdminInventoryBatchDTO> getActiveBatchesForLivestock(Long livestockId) {
        return batchRepository.findActiveWithUserAndLivestockByLivestockIdOrderByCreatedAtDesc(livestockId)
                .stream()
                .map(this::mapAdminBatch)
                .toList();
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public AdminInventoryBatchDTO archiveBatch(Long batchId, Long adminUserId, String ipAddress) {
        Batch batch = batchRepository.findByIdWithUserAndLivestock(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found."));

        if (batch.getCurrentCount() != null && batch.getCurrentCount() > 0) {
            throw new IllegalArgumentException("Only cleared batches can be archived.");
        }

        batch.setStatus("ARCHIVED");
        Batch savedBatch = batchRepository.save(batch);

        eventLogger.logActivity(
                adminUserId,
                truncateAction("Batch Archived: " + savedBatch.getName()),
                savedBatch.getId(),
                ipAddress
        );

        return mapAdminBatch(savedBatch);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public AdminInventoryBatchDTO updateBatchAssignment(
            Long batchId,
            UpdateBatchAssignmentRequest request,
            Long adminUserId,
            String ipAddress
    ) {
        Batch batch = batchRepository.findByIdWithUserAndLivestock(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Batch not found."));

        User handler = userRepository.findById(request.getHandlerId())
                .orElseThrow(() -> new EntityNotFoundException("Handler not found."));

        if (handler.getRole() != Role.ROLE_HANDLER) {
            throw new IllegalArgumentException("Selected user is not a handler.");
        }

        batch.setUser(handler);
        Batch savedBatch = batchRepository.save(batch);

        eventLogger.logActivity(
                adminUserId,
                truncateAction(String.format("Handler Assignment Updated: %s -> %s", savedBatch.getName(), resolveUserLabel(handler))),
                savedBatch.getId(),
                ipAddress
        );

        return mapAdminBatch(savedBatch);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public LivestockSummaryDTO updateLivestockType(
            Long livestockId,
            UpdateLivestockRequest request,
            Long adminUserId,
            String ipAddress
    ) {
        Livestock livestock = livestockRepository.findById(livestockId)
                .orElseThrow(() -> new EntityNotFoundException("Livestock type not found."));

        String cleanedType = cleanLivestockType(request.getType());
        livestockRepository.findByTypeIgnoreCase(cleanedType)
                .filter(existing -> !existing.getId().equals(livestockId))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("That livestock species already exists.");
                });

        livestock.setType(cleanedType);
        Livestock savedLivestock = livestockRepository.save(livestock);

        eventLogger.logActivity(
                adminUserId,
                truncateAction("Livestock Updated: " + savedLivestock.getType()),
                savedLivestock.getId(),
                ipAddress
        );

        List<Batch> batches = batchRepository.findByLivestockIdOrderByCreatedAtDesc(savedLivestock.getId());
        long batchCount = batches.size();
        long totalCurrentCount = batches.stream()
                .map(Batch::getCurrentCount)
                .filter(count -> count != null)
                .mapToLong(Integer::longValue)
                .sum();

        return new LivestockSummaryDTO(
                savedLivestock.getId(),
                savedLivestock.getType(),
                batchCount,
                totalCurrentCount
        );
    }

    private List<AdminActivityLogDTO> loadActivityLogs(Long userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<ActivityLog> logs = userId == null
                ? activityLogRepository.findByActionNotOrderByTimestampDesc("LOGIN", PageRequest.of(0, safeLimit))
                : activityLogRepository.findByUserIdAndActionNotOrderByTimestampDesc(userId, "LOGIN", PageRequest.of(0, safeLimit));

        return mapLogs(logs);
    }

    private List<AdminActivityLogDTO> mapLogs(List<ActivityLog> logs) {
        Map<Long, User> usersById = userRepository.findAllById(
                logs.stream()
                        .map(ActivityLog::getUserId)
                        .filter(id -> id != null)
                        .distinct()
                        .toList()
        ).stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return logs.stream()
                .map(log -> {
                    User user = usersById.get(log.getUserId());
                    return new AdminActivityLogDTO(
                            log.getId(),
                            log.getUserId(),
                            user != null ? user.getFullName() : null,
                            user != null ? user.getUsername() : null,
                            log.getAction(),
                            log.getTargetId(),
                            log.getTimestamp(),
                            log.getIpAddress()
                    );
                })
                .toList();
    }

    private Map<Long, Batch> loadTargetBatches(List<ActivityLog> logs) {
        List<Long> batchIds = logs.stream()
                .map(ActivityLog::getTargetId)
                .filter(id -> id != null)
                .distinct()
                .toList();

        if (batchIds.isEmpty()) {
            return Map.of();
        }

        return batchRepository.findAllByIdInWithLivestock(batchIds).stream()
                .collect(Collectors.toMap(Batch::getId, Function.identity()));
    }

    private HandlerActivityLogDTO mapHandlerActivityLog(ActivityLog log, User handler, Batch batch) {
        return new HandlerActivityLogDTO(
                log.getId(),
                log.getUserId(),
                handler.getFullName(),
                handler.getUsername(),
                log.getAction(),
                resolveActionType(log.getAction()),
                log.getTargetId(),
                batch != null ? batch.getName() : null,
                batch != null && batch.getLivestock() != null ? batch.getLivestock().getId() : null,
                batch != null && batch.getLivestock() != null ? batch.getLivestock().getType() : null,
                log.getTimestamp(),
                log.getIpAddress()
        );
    }

    private String resolveActionType(String action) {
        if (action == null || action.isBlank()) {
            return "GENERAL";
        }

        String normalized = action.toUpperCase();
        if (normalized.contains("FEED")) {
            return "FEEDING";
        }
        if (normalized.contains("MORTALITY") || normalized.contains("DEATH")) {
            return "MORTALITY";
        }
        if (normalized.contains("SALE") || normalized.contains("SOLD")) {
            return "SALE";
        }
        if (normalized.contains("VACCIN") || normalized.contains("MEDICINE")) {
            return "MEDICINE";
        }

        return "GENERAL";
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public void deleteLivestockSpecies(Long livestockId, Long adminUserId, String ipAddress) {
        Livestock livestock = livestockRepository.findById(livestockId)
                .orElseThrow(() -> new EntityNotFoundException("Livestock type not found."));

        List<Batch> batches = batchRepository.findByLivestockIdOrderByCreatedAtDesc(livestockId);
        for (Batch batch : batches) {
            eventRepository.deleteAllByBatchId(batch.getId());
            saleRepository.detachBatchReferences(batch.getId());
        }

        batchRepository.deleteAllByLivestockId(livestockId);
        livestockRepository.delete(livestock);

        eventLogger.logActivity(
                adminUserId,
                truncateAction("Livestock Deleted: " + livestock.getType()),
                livestockId,
                ipAddress
        );
    }

    private AdminInventoryBatchDTO mapAdminBatch(Batch batch) {
        LocalDate ageBaseDate = batch.getArrivalDate() != null
                ? batch.getArrivalDate()
                : batch.getCreatedAt().toLocalDate();
        long ageInDays = Math.max(0, ChronoUnit.DAYS.between(ageBaseDate, LocalDate.now()));
        User handler = batch.getUser();

        return new AdminInventoryBatchDTO(
                batch.getId(),
                batch.getLivestock().getId(),
                batch.getLivestock().getType(),
                batch.getName(),
                batch.getBreed(),
                batch.getInitialCount(),
                batch.getCurrentCount(),
                batch.getArrivalDate(),
                ageInDays,
                batch.getStatus(),
                handler != null ? handler.getId() : null,
                handler != null ? handler.getFullName() : null,
                handler != null ? handler.getUsername() : null
        );
    }

    private String resolveActiveZone(List<Batch> assignments) {
        if (assignments.isEmpty()) {
            return "Unassigned";
        }

        Batch batch = assignments.get(0);
        return String.format("%s • %s", batch.getLivestock().getType(), batch.getName());
    }

    private String resolveUserLabel(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        return user.getUsername();
    }

    private String resolveUserSortKey(User user) {
        String fullName = user.getFullName();
        if (fullName != null && !fullName.isBlank()) {
            return fullName.toLowerCase();
        }

        return user.getUsername() != null ? user.getUsername().toLowerCase() : "";
    }

    private String cleanLivestockType(String type) {
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("Livestock type is required.");
        }

        String trimmed = type.trim();
        return trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1);
    }

    private String truncateAction(String action) {
        if (action == null) {
            return null;
        }

        return action.length() <= 100 ? action : action.substring(0, 100);
    }
}
