package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventorySummaryResponseDTO {
    private Long totalLivestock;
    private Long totalSpecies;
    private Long totalActiveBatches;
    private List<LivestockSummaryDTO> speciesBreakdown;
}
