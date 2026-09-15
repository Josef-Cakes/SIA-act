package com.authapp.config;

import com.authapp.entity.EventType;
import com.authapp.entity.Livestock;
import com.authapp.repository.EventTypeRepository;
import com.authapp.repository.LivestockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Farm-Ville Data Initializer
 *
 * Creates essential EventTypes and Livestock types for the digitalized event tracking system.
 * This ensures the automatic inventory math can function properly from day one.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(2) // Run after the existing DataInitializer
public class FarmVilleDataInitializer implements CommandLineRunner {

    private final EventTypeRepository eventTypeRepository;
    private final LivestockRepository livestockRepository;

    @Override
    @Transactional
    public void run(String... args) {
        createDefaultEventTypes();
        createDefaultLivestockTypes();
    }

    /**
     * Create default EventTypes for the core engine.
     * These are essential for the automatic inventory math to work.
     */
    private void createDefaultEventTypes() {
        log.info("Initializing default EventTypes for Farm-Ville...");

        createEventTypeIfNotExists("MORTALITY", "Animal Death/Loss", true, -1);
        createEventTypeIfNotExists("SALE", "Sale Transaction", true, -1);
        createEventTypeIfNotExists("PURCHASE", "Stock Purchase", true, 1);
        createEventTypeIfNotExists("BIRTH", "New Birth", true, 1);
        createEventTypeIfNotExists("TRANSFER_IN", "Transfer In", true, 1);
        createEventTypeIfNotExists("TRANSFER_OUT", "Transfer Out", true, -1);
        createEventTypeIfNotExists("ADJUSTMENT_POSITIVE", "Inventory Adjustment (+)", true, 1);
        createEventTypeIfNotExists("ADJUSTMENT_NEGATIVE", "Inventory Adjustment (-)", true, -1);
        createEventTypeIfNotExists("FEEDING", "Feeding Activity", false, 0);
        createEventTypeIfNotExists("VACCINATION", "Vaccination", false, 0);
        createEventTypeIfNotExists("HEALTH_CHECK", "Health Inspection", false, 0);
        createEventTypeIfNotExists("CLEANING", "Cleaning Activity", false, 0);

        log.info("✓ Default EventTypes initialized successfully");
    }

    /**
     * Create default Livestock types for the Farm-Ville system.
     */
    private void createDefaultLivestockTypes() {
        log.info("Initializing default Livestock types...");

        createLivestockTypeIfNotExists("CATTLE");
        createLivestockTypeIfNotExists("POULTRY");
        createLivestockTypeIfNotExists("SWINE");
        createLivestockTypeIfNotExists("GOAT");
        createLivestockTypeIfNotExists("SHEEP");
        createLivestockTypeIfNotExists("FISH");

        log.info("✓ Default Livestock types initialized successfully");
    }

    /**
     * Create an EventType if it doesn't exist.
     *
     * @param code The unique code for the event type
     * @param displayName The human-readable name
     * @param affectsCount Whether this event affects inventory count
     * @param countSign +1 for increase, -1 for decrease, 0 for no impact
     */
    private void createEventTypeIfNotExists(String code, String displayName,
                                          Boolean affectsCount, Integer countSign) {
        if (eventTypeRepository.existsByCode(code)) {
            log.debug("EventType {} already exists, skipping", code);
            return;
        }

        EventType eventType = EventType.builder()
                .code(code)
                .displayName(displayName)
                .affectsCount(affectsCount)
                .countSign(countSign)
                .active(true)
                .build();

        eventTypeRepository.save(eventType);
        log.info("  ✓ Created EventType: {} ({})", code, displayName);
    }

    /**
     * Create a Livestock type if it doesn't exist.
     *
     * @param type The livestock type name
     */
    private void createLivestockTypeIfNotExists(String type) {
        if (livestockRepository.existsByType(type)) {
            log.debug("Livestock type {} already exists, skipping", type);
            return;
        }

        Livestock livestock = Livestock.builder()
                .type(type)
                .build();

        livestockRepository.save(livestock);
        log.info("  ✓ Created Livestock type: {}", type);
    }
}
