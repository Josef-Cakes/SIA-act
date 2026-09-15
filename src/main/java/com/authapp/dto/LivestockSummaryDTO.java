package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LivestockSummaryDTO {
    private Long id;
    private String type;
    private Long batchCount;
    private Long totalCurrentCount;
}
