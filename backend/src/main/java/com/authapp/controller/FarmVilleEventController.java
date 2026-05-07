package com.authapp.controller;

import com.authapp.entity.Batch;
import com.authapp.entity.Event;
import com.authapp.entity.EventType;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.EventTypeRepository;
import com.authapp.service.EventService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Farm-Ville Event Controller
 *
 * Provides API endpoints for the digitalized event tracking system.
 * Demonstrates the automatic inventory math functionality.
 */
@RestController
@RequestMapping("/api/farmville/events")
@RequiredArgsConstructor
@Slf4j
public class FarmVilleEventController {

    private final EventService eventService;
    private final EventTypeRepository eventTypeRepository;
    private final BatchRepository batchRepository;

    /**
     * Create a new event with automatic inventory management.
     *
     * POST /api/farmville/events
     */
    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody CreateEventRequest request) {
        try {
            // Validate batch exists
            Batch batch = batchRepository.findById(request.getBatchId())
                    .orElseThrow(() -> new RuntimeException("Batch not found"));

            // Validate event type exists
            EventType eventType = eventTypeRepository.findById(request.getEventTypeId())
                    .orElseThrow(() -> new RuntimeException("EventType not found"));

            // Create the event
            Event event = Event.builder()
                    .quantity(request.getQuantity())
                    .unit(request.getUnit())
                    .remarks(request.getRemarks())
                    .batch(batch)
                    .eventType(eventType)
                    .build();

            // Save event with automatic inventory math
            Event savedEvent = eventService.createEvent(event);

            log.info("Event created successfully with automatic inventory update");

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Event created with automatic inventory update",
                    "eventId", savedEvent.getId(),
                    "batchId", batch.getId(),
                    "previousCount", batch.getCurrentCount() - (savedEvent.getQuantityChange() != null ? savedEvent.getQuantityChange() : 0),
                    "newCount", batch.getCurrentCount(),
                    "quantityChange", savedEvent.getQuantityChange()
            ));

        } catch (Exception e) {
            log.error("Error creating event", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * Get all events for a batch.
     *
     * GET /api/farmville/events/batch/{batchId}
     */
    @GetMapping("/batch/{batchId}")
    public ResponseEntity<List<Event>> getEventsByBatch(@PathVariable Long batchId) {
        List<Event> events = eventService.getEventsByBatch(batchId);
        return ResponseEntity.ok(events);
    }

    /**
     * Get all event types.
     *
     * GET /api/farmville/events/types
     */
    @GetMapping("/types")
    public ResponseEntity<List<EventType>> getAllEventTypes() {
        List<EventType> eventTypes = eventTypeRepository.findActiveEventTypes();
        return ResponseEntity.ok(eventTypes);
    }

    /**
     * Get all events.
     *
     * GET /api/farmville/events
     */
    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        List<Event> events = eventService.getAllEvents();
        return ResponseEntity.ok(events);
    }

    /**
     * Request DTO for creating events.
     */
    public static class CreateEventRequest {
        public Long batchId;
        public Long eventTypeId;
        public Integer quantity;
        public String unit;
        public String remarks;

        // Getters
        public Long getBatchId() { return batchId; }
        public Long getEventTypeId() { return eventTypeId; }
        public Integer getQuantity() { return quantity; }
        public String getUnit() { return unit; }
        public String getRemarks() { return remarks; }
    }
}
