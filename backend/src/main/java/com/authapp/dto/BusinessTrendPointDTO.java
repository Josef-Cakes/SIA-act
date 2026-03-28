package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BusinessTrendPointDTO {
    private String date;
    private Double totalRevenue;
    private Long mortalityCount;
    private Long currentStock;
}
