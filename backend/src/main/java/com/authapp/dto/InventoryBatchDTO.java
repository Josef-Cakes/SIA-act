package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InventoryBatchDTO {
    private Long id;
    private Long livestockId;
    private String livestockType;
    private String name;
    private String breed;
    private Integer initialCount;
    private Integer currentCount;
    private LocalDate arrivalDate;
    private Long ageInDays;
}
