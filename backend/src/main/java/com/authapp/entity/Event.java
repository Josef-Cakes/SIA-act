package com.authapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // magnitude of the event (e.g., 3 deaths = quantity 3)
    @Column(nullable = false)
    private Integer quantity;

    /** Client-generated key used to make mobile retries safe. */
    @Column(name = "idempotency_key", unique = true, length = 100)
    private String idempotencyKey;

    /** Decimal measurement for activities such as feed issued in kilograms. */
    @Column(name = "measured_quantity", precision = 19, scale = 4)
    private BigDecimal measuredQuantity;

    /** Lifecycle state for immutable operational records. */
    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "POSTED";

    /** The original event when this record is a correction/reversal. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "correction_of_id")
    private Event correctionOf;

    @Column(name = "correction_reason", length = 500)
    private String correctionReason;

    private String unit;
    private String remarks;
    private Integer quantityChange;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_type_id", nullable = false)
    private EventType eventType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;
}
