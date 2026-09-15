package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceEfficiencyPointDTO {
    private String date;
    private Double feedConsumed;
    private Double survivalRate;
    private Long activePopulation;
}
