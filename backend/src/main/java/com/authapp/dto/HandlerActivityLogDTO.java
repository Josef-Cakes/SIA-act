package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandlerActivityLogDTO {
    private Long id;
    private Long userId;
    private String fullName;
    private String username;
    private String action;
    private String actionType;
    private Long targetId;
    private String batchName;
    private Long livestockId;
    private String livestockType;
    private LocalDateTime timestamp;
    private String ipAddress;
}
