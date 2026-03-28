package com.authapp.controller;

import com.authapp.entity.Livestock;
import com.authapp.repository.LivestockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Farm-Ville Livestock Controller
 *
 * Manages livestock types for the system.
 */
@RestController
@RequestMapping("/api/farmville/livestock")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class FarmVilleLivestockController {

    private final LivestockRepository livestockRepository;

    /**
     * Get all livestock types.
     *
     * GET /api/farmville/livestock
     */
    @GetMapping
    public ResponseEntity<List<Livestock>> getAllLivestockTypes() {
        List<Livestock> livestockTypes = livestockRepository.findAll();
        return ResponseEntity.ok(livestockTypes);
    }

    /**
     * Get livestock type by ID.
     *
     * GET /api/farmville/livestock/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Livestock> getLivestockById(@PathVariable Long id) {
        Livestock livestock = livestockRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Livestock type not found"));
        return ResponseEntity.ok(livestock);
    }
}
