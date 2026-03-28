package com.authapp.exception;

/**
 * Custom exception thrown when an Event (like a Sale) exceeds the currentCount of a Batch.
 * This is part of the digitalized event tracking system's inventory validation.
 */
public class InsufficientStockException extends RuntimeException {

    private final Long batchId;
    private final Integer currentCount;
    private final Integer requestedQuantity;

    public InsufficientStockException(Long batchId, Integer currentCount, Integer requestedQuantity) {
        super(String.format("Insufficient stock in batch %d. Available: %d, Requested: %d",
                batchId, currentCount, requestedQuantity));
        this.batchId = batchId;
        this.currentCount = currentCount;
        this.requestedQuantity = requestedQuantity;
    }

    public InsufficientStockException(String message, Long batchId, Integer currentCount, Integer requestedQuantity) {
        super(message);
        this.batchId = batchId;
        this.currentCount = currentCount;
        this.requestedQuantity = requestedQuantity;
    }

    public Long getBatchId() {
        return batchId;
    }

    public Integer getCurrentCount() {
        return currentCount;
    }

    public Integer getRequestedQuantity() {
        return requestedQuantity;
    }

    public Integer getShortfall() {
        return requestedQuantity - currentCount;
    }
}
