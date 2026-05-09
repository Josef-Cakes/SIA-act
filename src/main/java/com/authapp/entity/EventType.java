package com.authapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_types")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class EventType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // e.g., MORTALITY, SALE, ADJUSTMENT
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String displayName;

    // true if this type affects Batch.currentCount
    @Column(nullable = false)
    @Builder.Default
    private Boolean affectsCount = true;

    // +1 for increases, -1 for decreases
    @Column(nullable = false)
    @Builder.Default
    private Integer countSign = 1;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
