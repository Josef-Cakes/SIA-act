package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.dto.CreateBatchRequest;
import com.authapp.dto.CreateLivestockRequest;
import com.authapp.dto.InventoryBatchDTO;
import com.authapp.dto.LivestockSummaryDTO;
import com.authapp.entity.Batch;
import com.authapp.entity.Livestock;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.LivestockRepository;
import com.authapp.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class InventoryManagementService {

    private final LivestockRepository livestockRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final EventLogger eventLogger;

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'dashboard-livestock-summaries-' + #userId")
    public List<LivestockSummaryDTO> getLivestockSummaries(Long userId) {
        return isAdmin(userId)
                ? livestockRepository.findLivestockSummaries()
                : livestockRepository.findLivestockSummariesByUserId(userId);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = CacheNames.FARM_DATA, key = "'dashboard-livestock-batches-' + #userId + '-' + #livestockId")
    public List<InventoryBatchDTO> getBatchesForLivestock(Long userId, Long livestockId) {
        Livestock livestock = livestockRepository.findById(livestockId)
                .orElseThrow(() -> new EntityNotFoundException("Livestock type not found."));

        List<Batch> batches = isAdmin(userId)
                ? batchRepository.findActiveWithUserAndLivestockByLivestockIdOrderByCreatedAtDesc(livestock.getId())
                : batchRepository.findActiveWithLivestockByUserIdAndLivestockId(userId, livestock.getId());

        return batches.stream()
                .map(batch -> mapBatch(batch, livestock))
                .toList();
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public LivestockSummaryDTO createLivestock(Long userId, CreateLivestockRequest request, String ipAddress) {
        String livestockType = cleanLivestockType(request.getType());
        if (livestockRepository.existsByTypeIgnoreCase(livestockType)) {
            throw new IllegalArgumentException("That livestock species already exists.");
        }

        Livestock livestock = Livestock.builder()
                .type(livestockType)
                .build();

        Livestock savedLivestock = livestockRepository.save(livestock);
        eventLogger.logActivity(
                userId,
                truncateAction("New Livestock Species Created: " + savedLivestock.getType()),
                savedLivestock.getId(),
                ipAddress
        );

        return new LivestockSummaryDTO(savedLivestock.getId(), savedLivestock.getType(), 0L, 0L);
    }

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public InventoryBatchDTO createBatch(Long userId, CreateBatchRequest request, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Authenticated user not found."));

        Livestock livestock = livestockRepository.findById(request.getLivestockId())
                .orElseThrow(() -> new EntityNotFoundException("Livestock type not found."));

        Batch batch = Batch.builder()
                .name(cleanBatchName(request.getName()))
                .initialCount(request.getInitialCount())
                .currentCount(request.getInitialCount())
                .breed(cleanOptionalText(request.getBreed()))
                .arrivalDate(request.getArrivalDate())
                .status("ACTIVE")
                .user(user)
                .livestock(livestock)
                .build();

        Batch savedBatch = batchRepository.save(batch);
        eventLogger.logActivity(
                userId,
                truncateAction(String.format("New Batch Created: %s with %d head", savedBatch.getName(), savedBatch.getInitialCount())),
                savedBatch.getId(),
                ipAddress
        );

        return mapBatch(savedBatch, livestock);
    }

    private InventoryBatchDTO mapBatch(Batch batch, Livestock livestock) {
        LocalDate ageBaseDate = batch.getArrivalDate() != null
                ? batch.getArrivalDate()
                : batch.getCreatedAt().toLocalDate();

        long ageInDays = Math.max(0, ChronoUnit.DAYS.between(ageBaseDate, LocalDate.now()));

        return new InventoryBatchDTO(
                batch.getId(),
                livestock.getId(),
                livestock.getType(),
                batch.getName(),
                batch.getBreed(),
                batch.getInitialCount(),
                batch.getCurrentCount(),
                batch.getArrivalDate(),
                ageInDays,
                batch.getQrCode()
        );
    }

    private String cleanLivestockType(String type) {
        if (type == null || type.trim().isEmpty()) {
            throw new IllegalArgumentException("Livestock type is required.");
        }

        String trimmed = type.trim();
        return trimmed.substring(0, 1).toUpperCase() + trimmed.substring(1);
    }

    private String cleanBatchName(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Batch name is required.");
        }

        return name.trim();
    }

    private String cleanOptionalText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String truncateAction(String action) {
        if (action == null) {
            return null;
        }

        return action.length() <= 100 ? action : action.substring(0, 100);
    }

    private boolean isAdmin(Long userId) {
        return userRepository.findById(userId)
                .map(user -> user.getRole() == Role.ROLE_ADMIN)
                .orElse(false);
    }
}
