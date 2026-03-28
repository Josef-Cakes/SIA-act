package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminActivityLogDTO {
    private Long id;
    private Long userId;
    private String fullName;
    private String username;
    private String action;
    private Long targetId;
    private LocalDateTime timestamp;
    private String ipAddress;
}
