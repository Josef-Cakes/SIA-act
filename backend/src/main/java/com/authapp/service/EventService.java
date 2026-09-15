package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.entity.Batch;
import com.authapp.entity.Event;
import com.authapp.entity.EventType;
import com.authapp.exception.InsufficientStockException;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Optional;

/**
 * Core Engine: Digitalized Event Tracking
 *
 * This service provides automatic inventory math for the Farm-Ville system.
 * When an Event is created, it automatically updates the associated Batch.currentCount
 * based on the EventType configuration.
 *
 * Enhanced with InsufficientStockException for strict inventory validation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final BatchRepository batchRepository;

    /**
     * Create an event and automatically update batch inventory.
     *
     * Automatic Inventory Math Logic:
     * 1. Check if EventType.affectsCount is true
     * 2. Validate sufficient stock for negative operations (sales, mortality, etc.)
     * 3. If valid, update Batch.currentCount using:
     *    batch.currentCount += (event.quantity * eventType.countSign)
     * 4. Throw InsufficientStockException if stock would go negative
     *
     * @param event The event to create
     * @return The saved event with updated batch inventory
     * @throws InsufficientStockException if event would cause negative inventory
     */
    @Transactional
    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public Event createEvent(Event event) {
        validateEventRequest(event);

        if (event.getIdempotencyKey() != null && !event.getIdempotencyKey().isBlank()) {
            Optional<Event> existing = eventRepository.findByIdempotencyKey(event.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                Event existingEvent = existing.get();
                if (!sameEventTarget(event, existingEvent)) {
                    throw new IllegalArgumentException("The operation identifier is already used for another action.");
                }
                return existingEvent;
            }
            event.setIdempotencyKey(event.getIdempotencyKey().trim());
        }

        if (event.getBatch() == null || event.getBatch().getId() == null) {
            throw new IllegalArgumentException("A batch is required for an event.");
        }

        // Always reload the aggregate under a database write lock. The caller
        // may have supplied a stale JPA instance, especially after an offline
        // retry or when two handlers act on the same batch concurrently.
        Batch lockedBatch = batchRepository.findByIdForUpdate(event.getBatch().getId())
                .orElseThrow(() -> new EntityNotFoundException("Batch not found."));
        if (lockedBatch.getCurrentCount() == null || lockedBatch.getCurrentCount() < 0) {
            throw new IllegalArgumentException("Batch inventory is invalid and requires reconciliation.");
        }
        event.setBatch(lockedBatch);

        log.debug("Creating event: {} for batch: {}",
                 event.getEventType().getCode(),
                 lockedBatch.getId());

        // Validate inventory before processing
        validateInventoryForEvent(event);

        // Save the event first
        Event savedEvent = eventRepository.save(event);

        // Automatic Inventory Math
        processEventInventoryUpdate(savedEvent);

        log.info("Event created successfully - ID: {}, Type: {}, Quantity: {}, Batch: {}",
                savedEvent.getId(),
                savedEvent.getEventType().getCode(),
                savedEvent.getQuantity(),
                savedEvent.getBatch().getId());

        return savedEvent;
    }

    /**
     * Validate inventory for the event to prevent negative stock.
     *
     * @param event The event to validate
     * @throws InsufficientStockException if inventory would go negative
     */
    private void validateInventoryForEvent(Event event) {
        EventType eventType = event.getEventType();
        Batch batch = event.getBatch();

        // Only validate for events that affect count and decrease inventory
        if (!eventType.getAffectsCount() || eventType.getCountSign() >= 0) {
            return; // No validation needed for non-affecting or positive events
        }

        // Calculate the inventory impact
        Integer quantity = event.getQuantity();
        Integer countSign = eventType.getCountSign();
        Integer inventoryDecrease;
        try {
            inventoryDecrease = Math.abs(Math.multiplyExact(quantity, countSign));
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Event quantity is too large.");
        }

        // Check if sufficient stock is available
        Integer currentCount = batch.getCurrentCount();
        if (currentCount == null || currentCount < 0) {
            throw new IllegalArgumentException("Batch inventory is invalid and requires reconciliation.");
        }
        if (currentCount < inventoryDecrease) {
            log.warn("Insufficient stock validation failed - Batch: {}, Available: {}, Requested: {}",
                    batch.getId(), currentCount, inventoryDecrease);

            throw new InsufficientStockException(
                    batch.getId(),
                    currentCount,
                    inventoryDecrease
            );
        }

        log.debug("Inventory validation passed - Batch: {}, Available: {}, Required: {}",
                batch.getId(), currentCount, inventoryDecrease);
    }

    /**
     * Process automatic inventory updates based on event.
     * This method assumes validation has already been performed.
     *
     * @param event The event that was just created
     */
    private void processEventInventoryUpdate(Event event) {
        EventType eventType = event.getEventType();
        Batch batch = event.getBatch();

        // Check if this event type affects inventory count
        if (!eventType.getAffectsCount()) {
            log.debug("EventType {} does not affect count - skipping inventory update",
                     eventType.getCode());
            return;
        }

        // Calculate the change in inventory
        Integer quantity = event.getQuantity();
        Integer countSign = eventType.getCountSign();
        Integer inventoryChange;
        try {
            inventoryChange = Math.multiplyExact(quantity, countSign);
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Inventory count exceeds the supported range.");
        }

        // Get current count and calculate new count
        Integer currentCount = batch.getCurrentCount();
        Integer newCount;
        try {
            newCount = Math.addExact(currentCount, inventoryChange);
        } catch (ArithmeticException ex) {
            throw new IllegalArgumentException("Inventory count exceeds the supported range.");
        }

        // Since validation was already performed, newCount should never be negative
        // But keep safety check for data integrity
        if (newCount < 0) {
            log.error("CRITICAL: Negative inventory detected after validation! " +
                     "Batch: {}, Current: {}, Change: {}, Resetting to 0",
                    batch.getId(), currentCount, inventoryChange);
            newCount = 0;
        }

        // Update the batch current count
        batch.setCurrentCount(newCount);
        batchRepository.save(batch);

        // Store the actual quantity change that was applied
        event.setQuantityChange(newCount - currentCount);
        eventRepository.save(event);

        log.info("Inventory updated - Batch: {}, Previous Count: {}, Change: {}, New Count: {}",
                batch.getId(), currentCount, inventoryChange, newCount);
    }

    private void validateEventRequest(Event event) {
        if (event == null || event.getEventType() == null) {
            throw new IllegalArgumentException("Event type is required.");
        }
        if (event.getQuantity() == null || event.getQuantity() <= 0) {
            throw new IllegalArgumentException("Event quantity must be greater than 0.");
        }
        if (event.getEventType().getAffectsCount() == null
                || event.getEventType().getCountSign() == null
                || event.getEventType().getActive() == null
                || !event.getEventType().getActive()
                || event.getEventType().getCountSign() < -1
                || event.getEventType().getCountSign() > 1
                || (event.getEventType().getAffectsCount() && event.getEventType().getCountSign() == 0)
                || (!event.getEventType().getAffectsCount() && event.getEventType().getCountSign() != 0)) {
            throw new IllegalArgumentException("Event type has an invalid inventory configuration.");
        }
    }

    private boolean sameEventTarget(Event requested, Event existing) {
        Long requestedBatchId = requested.getBatch() != null ? requested.getBatch().getId() : null;
        Long existingBatchId = existing.getBatch() != null ? existing.getBatch().getId() : null;
        Long requestedUserId = requested.getUser() != null ? requested.getUser().getId() : null;
        Long existingUserId = existing.getUser() != null ? existing.getUser().getId() : null;
        String requestedType = requested.getEventType() != null ? requested.getEventType().getCode() : null;
        String existingType = existing.getEventType() != null ? existing.getEventType().getCode() : null;
        return java.util.Objects.equals(requestedBatchId, existingBatchId)
                && java.util.Objects.equals(requestedUserId, existingUserId)
                && java.util.Objects.equals(requestedType, existingType)
                && java.util.Objects.equals(requested.getQuantity(), existing.getQuantity());
    }

    /**
     * Get all events for a specific batch, ordered by creation date.
     *
     * @param batchId The batch ID
     * @return List of events for the batch
     */
    @Transactional(readOnly = true)
    public List<Event> getEventsByBatch(Long batchId) {
        return eventRepository.findByBatchIdOrderByCreatedAtDesc(batchId);
    }

    /**
     * Get all events by event type.
     *
     * @param eventTypeId The event type ID
     * @return List of events of that type
     */
    @Transactional(readOnly = true)
    public List<Event> getEventsByType(Long eventTypeId) {
        return eventRepository.findByEventTypeIdOrderByCreatedAtDesc(eventTypeId);
    }

    /**
     * Get all events.
     *
     * @return List of all events
     */
    @Transactional(readOnly = true)
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    /**
     * Get event by ID.
     *
     * @param id The event ID
     * @return The event
     */
    @Transactional(readOnly = true)
    public Event getEventById(Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found with id: " + id));
    }

    /**
     * Check batch stock availability for a given quantity.
     *
     * @param batchId The batch ID
     * @param requiredQuantity The quantity to check
     * @return true if sufficient stock is available
     */
    @Transactional(readOnly = true)
    public boolean hasStockAvailable(Long batchId, Integer requiredQuantity) {
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found with id: " + batchId));

        return batch.getCurrentCount() >= requiredQuantity;
    }
}
