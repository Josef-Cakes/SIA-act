package com.authapp.repository;

import com.authapp.dto.DailyLongMetricDTO;
import com.authapp.dto.DailyDecimalMetricDTO;
import com.authapp.dto.DashboardRecentLogDTO;
import com.authapp.entity.Event;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    Optional<Event> findByIdempotencyKey(String idempotencyKey);

    Optional<Event> findByCorrectionOfId(Long correctionOfId);

    @Query("""
            SELECT e
            FROM Event e
            JOIN FETCH e.batch b
            JOIN FETCH b.livestock
            JOIN FETCH e.eventType
            LEFT JOIN FETCH e.user
            WHERE e.id = :eventId
            """)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Event> findByIdWithBatchAndType(@Param("eventId") Long eventId);

    List<Event> findByBatchIdOrderByCreatedAtDesc(Long batchId);

    @Query("""
            SELECT e
            FROM Event e
            JOIN FETCH e.batch
            JOIN FETCH e.eventType
            LEFT JOIN FETCH e.user
            LEFT JOIN FETCH e.correctionOf
            WHERE e.createdAt >= :from
              AND e.createdAt < :to
            ORDER BY e.createdAt ASC, e.id ASC
            """)
    List<Event> findForReportBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    long deleteAllByBatchId(Long batchId);

    List<Event> findByEventTypeIdOrderByCreatedAtDesc(Long eventTypeId);

    @Query("SELECT e FROM Event e WHERE e.batch.id = :batchId AND e.createdAt BETWEEN :startDate AND :endDate")
    List<Event> findByBatchIdAndDateRange(@Param("batchId") Long batchId,
                                         @Param("startDate") LocalDateTime startDate,
                                         @Param("endDate") LocalDateTime endDate);

    @Query("SELECT e FROM Event e WHERE e.eventType.code = :eventTypeCode")
    List<Event> findByEventTypeCode(@Param("eventTypeCode") String eventTypeCode);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.createdAt >= :since")
    Long countCreatedSince(@Param("since") LocalDateTime since);

    @Query("SELECT COUNT(e) FROM Event e WHERE e.user.id = :userId AND e.createdAt >= :since")
    Long countByUserIdAndCreatedAtSince(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantityChange), 0)
            )
            FROM Event e
            WHERE e.createdAt >= :since
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumQuantityChangeByDaySince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantityChange), 0)
            )
            FROM Event e
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumQuantityChangeByDayAllTime();

    @Query("""
            SELECT new com.authapp.dto.DailyDecimalMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.measuredQuantity), 0)
            )
            FROM Event e
            WHERE e.createdAt >= :since
              AND e.batch.livestock.id = :livestockId
              AND e.eventType.code = 'FEEDING'
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyDecimalMetricDTO> sumFeedingQuantityByDaySinceAndLivestockId(
            @Param("livestockId") Long livestockId,
            @Param("since") LocalDateTime since
    );

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantityChange), 0)
            )
            FROM Event e
            WHERE e.createdAt >= :since
              AND e.batch.livestock.id = :livestockId
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumQuantityChangeByDaySinceAndLivestockId(
            @Param("livestockId") Long livestockId,
            @Param("since") LocalDateTime since
    );

    @Query("SELECT MIN(e.createdAt) FROM Event e")
    LocalDateTime findEarliestCreatedAt();

    @Query("SELECT MIN(e.createdAt) FROM Event e WHERE e.eventType.code = :eventTypeCode")
    LocalDateTime findEarliestCreatedAtByEventTypeCode(@Param("eventTypeCode") String eventTypeCode);

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantity), 0)
            )
            FROM Event e
            WHERE e.createdAt >= :since
              AND e.eventType.code = 'MORTALITY'
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumMortalityQuantityByDaySince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantity), 0)
            )
            FROM Event e
            WHERE e.eventType.code = 'MORTALITY'
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumMortalityQuantityByDayAllTime();

    @Query("""
            SELECT new com.authapp.dto.DashboardRecentLogDTO(
                e.id,
                e.eventType.code,
                e.batch.id,
                e.batch.name,
                e.quantity,
                e.measuredQuantity,
                e.remarks,
                e.createdAt
            )
            FROM Event e
            WHERE e.user.id = :userId
            ORDER BY e.createdAt DESC
            """)
    List<DashboardRecentLogDTO> findRecentDashboardLogsByUserId(@Param("userId") Long userId, Pageable pageable);
}
