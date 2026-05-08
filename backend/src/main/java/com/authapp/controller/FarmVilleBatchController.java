package com.authapp.controller;

import com.authapp.cache.CacheNames;
import com.authapp.entity.Batch;
import com.authapp.entity.Livestock;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.LivestockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Farm-Ville Batch Controller
 *
 * Manages livestock batches for inventory tracking.
 */
@RestController
@RequestMapping("/api/farmville/batches")
@RequiredArgsConstructor
public class FarmVilleBatchController {

    private final BatchRepository batchRepository;
    private final LivestockRepository livestockRepository;

    /**
     * Create a new batch.
     *
     * POST /api/farmville/batches
     */
    @PostMapping
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public ResponseEntity<?> createBatch(@RequestBody CreateBatchRequest request) {
        try {
            // Validate livestock type exists
            Livestock livestock = livestockRepository.findById(request.getLivestockId())
                    .orElseThrow(() -> new RuntimeException("Livestock type not found"));

            // Create the batch
            Batch batch = Batch.builder()
                    .name(request.getName())
                    .initialCount(request.getInitialCount())
                    .currentCount(request.getInitialCount()) // Start with initial count
                    .status("ACTIVE")
                    .livestock(livestock)
                    .build();

            Batch savedBatch = batchRepository.save(batch);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Batch created successfully",
                    "batchId", savedBatch.getId(),
                    "name", savedBatch.getName(),
                    "initialCount", savedBatch.getInitialCount(),
                    "currentCount", savedBatch.getCurrentCount()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get all batches.
     *
     * GET /api/farmville/batches
     */
    @GetMapping
    public ResponseEntity<List<Batch>> getAllBatches() {
        List<Batch> batches = batchRepository.findAll();
        return ResponseEntity.ok(batches);
    }

    /**
     * Get active batches (currentCount > 0).
     *
     * GET /api/farmville/batches/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<Batch>> getActiveBatches() {
        List<Batch> activeBatches = batchRepository.findActiveBatches();
        return ResponseEntity.ok(activeBatches);
    }

    /**
     * Get batch by ID.
     *
     * GET /api/farmville/batches/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Batch> getBatchById(@PathVariable Long id) {
        Batch batch = batchRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Batch not found"));
        return ResponseEntity.ok(batch);
    }

    /**
     * Request DTO for creating batches.
     */
    public static class CreateBatchRequest {
        public String name;
        public Integer initialCount;
        public Long livestockId;

        // Getters
        public String getName() { return name; }
        public Integer getInitialCount() { return initialCount; }
        public Long getLivestockId() { return livestockId; }
    }
}
