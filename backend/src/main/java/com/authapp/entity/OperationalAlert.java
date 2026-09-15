package com.authapp.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/** Actionable exception with an owner, lifecycle, and resolution history. */
@Entity
@Table(name = "operational_alerts", indexes = {
        @Index(name = "idx_operational_alerts_assignee_status", columnList = "assigned_user_id,status"),
        @Index(name = "idx_operational_alerts_due_at", columnList = "due_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OperationalAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private Long version = 0L;

    @Column(name = "rule_code", nullable = false, length = 80)
    private String ruleCode;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String severity = "WARNING";

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "OPEN";

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_user_id")
    private User assignedUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id")
    private User createdBy;
}
