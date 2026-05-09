package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminHandlerSummaryDTO {
    private Long id;
    private String fullName;
    private String username;
    private String email;
    private String activeZone;
    private Long activeBatchCount;
    private Long totalLivestock;
}
