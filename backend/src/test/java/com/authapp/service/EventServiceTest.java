package com.authapp.service;

import com.authapp.entity.Batch;
import com.authapp.entity.Event;
import com.authapp.entity.EventType;
import com.authapp.exception.InsufficientStockException;
import com.authapp.repository.BatchRepository;
import com.authapp.repository.EventRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventRepository eventRepository;

    @Mock
    private BatchRepository batchRepository;

    @Test
    void createEventLocksFreshBatchBeforeApplyingInventoryChange() {
        Batch staleBatch = Batch.builder().id(7L).currentCount(99).initialCount(99).build();
        Batch lockedBatch = Batch.builder().id(7L).currentCount(5).initialCount(5).build();
        EventType mortality = EventType.builder()
                .code("MORTALITY")
                .affectsCount(true)
                .countSign(-1)
                .build();
        Event event = Event.builder()
                .batch(staleBatch)
                .eventType(mortality)
                .quantity(2)
                .build();

        when(batchRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(lockedBatch));
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Event saved = new EventService(eventRepository, batchRepository).createEvent(event);

        assertSame(lockedBatch, saved.getBatch());
        assertEquals(3, lockedBatch.getCurrentCount());
        assertEquals(-2, saved.getQuantityChange());
        verify(batchRepository).findByIdForUpdate(7L);
    }

    @Test
    void createEventRejectsInsufficientStockBeforePersisting() {
        Batch batch = Batch.builder().id(7L).currentCount(2).initialCount(2).build();
        EventType mortality = EventType.builder()
                .code("MORTALITY")
                .affectsCount(true)
                .countSign(-1)
                .build();
        Event event = Event.builder().batch(batch).eventType(mortality).quantity(3).build();

        when(batchRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(batch));

        assertThrows(InsufficientStockException.class,
                () -> new EventService(eventRepository, batchRepository).createEvent(event));
        verify(eventRepository, never()).save(any(Event.class));
    }

    @Test
    void createEventReturnsExistingOperationOnRetry() {
        Batch batch = Batch.builder().id(7L).currentCount(5).initialCount(5).build();
        EventType feeding = EventType.builder()
                .code("FEEDING")
                .affectsCount(false)
                .countSign(0)
                .build();
        Event existing = Event.builder()
                .id(42L)
                .batch(batch)
                .eventType(feeding)
                .quantity(10)
                .idempotencyKey("operation-1")
                .build();
        Event retry = Event.builder()
                .batch(batch)
                .eventType(feeding)
                .quantity(10)
                .idempotencyKey("operation-1")
                .build();

        when(eventRepository.findByIdempotencyKey("operation-1")).thenReturn(Optional.of(existing));

        Event result = new EventService(eventRepository, batchRepository).createEvent(retry);

        assertSame(existing, result);
        verify(batchRepository, never()).findByIdForUpdate(7L);
        verify(eventRepository, never()).save(any(Event.class));
    }
}
