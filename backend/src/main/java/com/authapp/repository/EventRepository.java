package com.authapp.repository;

import com.authapp.dto.DailyLongMetricDTO;
import com.authapp.dto.DashboardRecentLogDTO;
import com.authapp.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    List<Event> findByBatchIdOrderByCreatedAtDesc(Long batchId);

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
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(e.quantity), 0)
            )
            FROM Event e
            WHERE e.createdAt >= :since
              AND e.batch.livestock.id = :livestockId
              AND e.eventType.code = 'FEEDING'
            GROUP BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', e.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyLongMetricDTO> sumFeedingQuantityByDaySinceAndLivestockId(
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

    @Query("""
            SELECT new com.authapp.dto.DashboardRecentLogDTO(
                e.id,
                e.eventType.code,
                e.batch.id,
                e.batch.name,
                e.quantity,
                e.remarks,
                e.createdAt
            )
            FROM Event e
            WHERE e.user.id = :userId
            ORDER BY e.createdAt DESC
            """)
    List<DashboardRecentLogDTO> findRecentDashboardLogsByUserId(@Param("userId") Long userId, Pageable pageable);
}
