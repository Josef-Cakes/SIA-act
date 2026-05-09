package com.authapp.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardBatchOptionDTO {
    private Long id;
    private String name;
    private String livestockType;
    private Integer currentCount;
}
