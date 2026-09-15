package com.authapp.exception;

import com.authapp.dto.ApiResponse;
import com.authapp.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.dao.PessimisticLockingFailureException;

import jakarta.persistence.EntityNotFoundException;
import java.util.HashMap;
import java.util.Map;

/**
 * Consolidated Global Exception Handler using @RestControllerAdvice.
 * Returns standardized JSON error responses with timestamps.
 * Handles both auth system and Farm-Ville backend exceptions.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handle validation errors (e.g., @Valid, @NotBlank).
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex, WebRequest request) {

        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Validation failed: {} for URI: {}", errors, path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "Validation failed: " + errors,
                "VALIDATION_ERROR",
                HttpStatus.BAD_REQUEST.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handle InsufficientStockException for Farm-Ville digital tracking.
     */
    @ExceptionHandler(InsufficientStockException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleInsufficientStockException(
            InsufficientStockException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Insufficient stock - Batch: {}, Available: {}, Requested: {}, Shortfall: {}",
                ex.getBatchId(), ex.getCurrentCount(), ex.getRequestedQuantity(), ex.getShortfall());

        ErrorResponse errorResponse = ErrorResponse.of(
                ex.getMessage(),
                "INSUFFICIENT_STOCK",
                HttpStatus.BAD_REQUEST.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handle JPA EntityNotFoundException.
     */
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleEntityNotFoundException(
            EntityNotFoundException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Entity not found: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "Resource not found: " + ex.getMessage(),
                "ENTITY_NOT_FOUND",
                HttpStatus.NOT_FOUND.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * Handle authentication exceptions (e.g., bad credentials).
     */
    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(
            AuthenticationException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Authentication failed: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "Authentication failed: " + ex.getMessage(),
                "AUTHENTICATION_FAILED",
                HttpStatus.UNAUTHORIZED.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handle bad credentials specifically.
     */
    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Bad credentials: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "Invalid username or password",
                "BAD_CREDENTIALS",
                HttpStatus.UNAUTHORIZED.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handle access denied (403 Forbidden).
     */
    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Access denied: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "Access denied: You don't have permission to access this resource",
                "ACCESS_DENIED",
                HttpStatus.FORBIDDEN.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    /**
     * Handle max upload size exceeded.
     */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    @ResponseStatus(HttpStatus.PAYLOAD_TOO_LARGE)
    public ResponseEntity<ErrorResponse> handleMaxSizeException(
            MaxUploadSizeExceededException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("File upload size exceeded: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "File size exceeds maximum limit of 5MB",
                "FILE_SIZE_EXCEEDED",
                HttpStatus.PAYLOAD_TOO_LARGE.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(errorResponse);
    }

    /**
     * Handle resource not found exceptions.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Resource not found: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                ex.getMessage(),
                "RESOURCE_NOT_FOUND",
                HttpStatus.NOT_FOUND.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * Handle illegal argument exceptions.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Illegal argument: {} for URI: {}", ex.getMessage(), path);

        ErrorResponse errorResponse = ErrorResponse.of(
                ex.getMessage(),
                "ILLEGAL_ARGUMENT",
                HttpStatus.BAD_REQUEST.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Includes duplicate idempotency keys and other database uniqueness
     * conflicts. Returning 409 lets a mobile client distinguish a conflict
     * from malformed input and decide whether to reconcile or retry.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Data integrity conflict for URI: {}", path);

        ErrorResponse errorResponse = ErrorResponse.of(
                "The operation conflicts with an existing record.",
                "DATA_CONFLICT",
                HttpStatus.CONFLICT.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    @ExceptionHandler({
            ObjectOptimisticLockingFailureException.class,
            PessimisticLockingFailureException.class
    })
    @ResponseStatus(HttpStatus.CONFLICT)
    public ResponseEntity<ErrorResponse> handleInventoryConcurrencyConflict(
            RuntimeException ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.warn("Concurrent update conflict for URI: {}", path);
        ErrorResponse errorResponse = ErrorResponse.of(
                "This record changed while you were saving. Refresh the batch and try again.",
                "CONCURRENT_UPDATE",
                HttpStatus.CONFLICT.value(),
                path
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * Handle generic exceptions (catch-all).
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, WebRequest request) {

        String path = request.getDescription(false).replace("uri=", "");
        logger.error("Unexpected error: {} for URI: {}", ex.getMessage(), path, ex);

        ErrorResponse errorResponse = ErrorResponse.of(
                "An unexpected error occurred. Please try again later.",
                "INTERNAL_SERVER_ERROR",
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                path
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
