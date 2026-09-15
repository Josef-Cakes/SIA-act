package com.authapp.service;

import com.authapp.cache.CacheNames;
import com.authapp.entity.Event;
import com.authapp.entity.EventType;
import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.EventRepository;
import com.authapp.repository.EventTypeRepository;
import com.authapp.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;

/**
 * Creates auditable compensating events instead of editing or deleting history.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class EventCorrectionService {

    private static final String POSTED = "POSTED";
    private static final String CORRECTED = "CORRECTED";

    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final UserRepository userRepository;
    private final EventService eventService;
    private final EventLogger eventLogger;

    @CacheEvict(value = CacheNames.FARM_DATA, allEntries = true)
    public Event correctEvent(Long eventId, Long actorId, String reason, String operationId, String ipAddress) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new AccessDeniedException("Authenticated user not found."));
        Event original = eventRepository.findByIdWithBatchAndType(eventId)
                .orElseThrow(() -> new EntityNotFoundException("Operation not found."));

        if (original.getUser() == null || original.getUser().getId() == null) {
            throw new IllegalArgumentException("This operation has no accountable actor and cannot be corrected.");
        }
        if (actor.getRole() != Role.ROLE_ADMIN && !Objects.equals(actorId, original.getUser().getId())) {
            throw new AccessDeniedException("Only the original actor or an administrator can correct this operation.");
        }
        if (!POSTED.equalsIgnoreCase(defaultStatus(original.getStatus()))) {
            throw new IllegalArgumentException("Only posted operations can be corrected.");
        }
        if ("SALE".equalsIgnoreCase(original.getEventType().getCode())) {
            throw new IllegalArgumentException("Sales corrections require the finance workflow and are not available yet.");
        }

        if (operationId != null && !operationId.isBlank()) {
            Event existingByOperation = eventRepository.findByIdempotencyKey(operationId.trim()).orElse(null);
            if (existingByOperation != null) {
                if (!Objects.equals(existingByOperation.getCorrectionOf() != null
                        ? existingByOperation.getCorrectionOf().getId() : null, eventId)) {
                    throw new IllegalArgumentException("The operation identifier is already used for another action.");
                }
                return existingByOperation;
            }
        }

        Event existingCorrection = eventRepository.findByCorrectionOfId(eventId).orElse(null);
        if (existingCorrection != null) {
            throw new IllegalArgumentException("This operation already has a correction.");
        }

        String cleanedReason = reason == null ? "" : reason.trim();
        if (cleanedReason.isBlank()) {
            throw new IllegalArgumentException("A correction reason is required.");
        }

        EventType correctionType = eventTypeRepository.findByCode(resolveCorrectionType(original))
                .orElseThrow(() -> new IllegalStateException("Correction event types are not initialized."));

        Event correction = Event.builder()
                .quantity(original.getQuantity())
                .measuredQuantity(original.getMeasuredQuantity())
                .unit(original.getUnit())
                .remarks("Correction of operation #" + eventId + ": " + cleanedReason)
                .batch(original.getBatch())
                .eventType(correctionType)
                .user(actor)
                .idempotencyKey(cleanOperationId(operationId))
                .status(POSTED)
                .correctionOf(original)
                .correctionReason(cleanedReason)
                .build();

        Event savedCorrection = eventService.createEvent(correction);
        original.setStatus(CORRECTED);
        eventRepository.save(original);
        eventLogger.logActivity(
                actorId,
                "CORRECTED_OPERATION: " + eventId,
                original.getBatch().getId(),
                ipAddress
        );
        return savedCorrection;
    }

    private String resolveCorrectionType(Event original) {
        EventType eventType = original.getEventType();
        if (!Boolean.TRUE.equals(eventType.getAffectsCount())) {
            return "CORRECTION_NOTE";
        }
        return eventType.getCountSign() < 0 ? "CORRECTION_INCREASE" : "CORRECTION_DECREASE";
    }

    private String defaultStatus(String status) {
        return status == null || status.isBlank() ? POSTED : status.toUpperCase(Locale.ROOT);
    }

    private String cleanOperationId(String operationId) {
        if (operationId == null || operationId.isBlank()) {
            return null;
        }
        return operationId.trim();
    }
}
