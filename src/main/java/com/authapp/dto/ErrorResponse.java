package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Standardized Error Response DTO for consistent error handling.
 * Includes timestamp for debugging and tracking purposes.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponse {

    private boolean success;
    private String message;
    private String error;
    private int status;
    private String path;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    /**
     * Factory method for creating error responses.
     */
    public static ErrorResponse of(String message, String error, int status, String path) {
        return ErrorResponse.builder()
                .success(false)
                .message(message)
                .error(error)
                .status(status)
                .path(path)
                .build();
    }

    /**
     * Factory method for creating simple error responses.
     */
    public static ErrorResponse of(String message, int status) {
        return ErrorResponse.builder()
                .success(false)
                .message(message)
                .status(status)
                .build();
    }
}