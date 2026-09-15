package com.authapp.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private Integer initialCount;

    @Column(nullable = false)
    private Integer currentCount;

    /** Stable printable identifier for a physical batch label. */
    @Column(name = "qr_code", unique = true, length = 100)
    private String qrCode;

    /**
     * Hibernate optimistic-lock version. Inventory operations also acquire a
     * database write lock before validating and applying count changes.
     */
    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(length = 100)
    private String breed;

    private LocalDate arrivalDate;

    private String status;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "livestock_id", nullable = false)
    private Livestock livestock;

    @JsonIgnore
    @OneToMany(mappedBy = "batch")
    private List<Sale> sales;

    @JsonIgnore
    @OneToMany(mappedBy = "batch")
    private List<Event> events;

    @PrePersist
    protected void assignQrCode() {
        if (qrCode == null || qrCode.isBlank()) {
            qrCode = "FARM-BATCH-" + UUID.randomUUID();
        }
    }
}
