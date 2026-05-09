package com.authapp.repository;

import com.authapp.dto.DashboardBatchOptionDTO;
import com.authapp.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByLivestockIdOrderByCreatedAtDesc(Long livestockId);

    List<Batch> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("""
            SELECT b
            FROM Batch b
            JOIN FETCH b.user u
            JOIN FETCH b.livestock l
            WHERE b.currentCount > 0
              AND (b.status IS NULL OR UPPER(b.status) <> 'ARCHIVED')
            ORDER BY b.createdAt DESC
            """)
    List<Batch> findActiveWithUserAndLivestockOrderByCreatedAtDesc();

    @Query("SELECT b FROM Batch b JOIN FETCH b.livestock WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    List<Batch> findWithLivestockByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("""
            SELECT b
            FROM Batch b
            JOIN FETCH b.user u
            JOIN FETCH b.livestock l
            WHERE l.id = :livestockId
              AND b.currentCount > 0
              AND (b.status IS NULL OR UPPER(b.status) <> 'ARCHIVED')
            ORDER BY b.createdAt DESC
            """)
    List<Batch> findActiveWithUserAndLivestockByLivestockIdOrderByCreatedAtDesc(@Param("livestockId") Long livestockId);

    @Query("""
            SELECT b
            FROM Batch b
            LEFT JOIN FETCH b.user u
            JOIN FETCH b.livestock l
            WHERE b.id = :batchId
            """)
    Optional<Batch> findByIdWithUserAndLivestock(@Param("batchId") Long batchId);

    @Query("""
            SELECT DISTINCT b
            FROM Batch b
            JOIN FETCH b.livestock l
            WHERE b.id IN :batchIds
            """)
    List<Batch> findAllByIdInWithLivestock(@Param("batchIds") List<Long> batchIds);

    @Query("SELECT b FROM Batch b WHERE b.status = :status")
    List<Batch> findByStatus(@Param("status") String status);

    @Query("SELECT b FROM Batch b WHERE b.livestock.type = :livestockType")
    List<Batch> findByLivestockType(@Param("livestockType") String livestockType);

    @Query("SELECT b FROM Batch b WHERE b.currentCount > 0")
    List<Batch> findActiveBatches();

    @Query("SELECT COALESCE(SUM(b.currentCount), 0) FROM Batch b")
    Long sumCurrentCount();

    @Query("SELECT COALESCE(SUM(b.currentCount), 0) FROM Batch b WHERE b.livestock.id = :livestockId")
    Long sumCurrentCountByLivestockId(@Param("livestockId") Long livestockId);

    @Query("SELECT COALESCE(SUM(b.initialCount), 0) FROM Batch b WHERE b.livestock.id = :livestockId")
    Long sumInitialCountByLivestockId(@Param("livestockId") Long livestockId);

    @Query("SELECT MIN(b.createdAt) FROM Batch b")
    LocalDateTime findEarliestCreatedAt();

    @Query("SELECT COALESCE(SUM(b.currentCount), 0) FROM Batch b WHERE b.user.id = :userId AND b.currentCount > 0")
    Long sumCurrentCountByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(b) FROM Batch b WHERE b.currentCount > 0")
    Long countActiveBatches();

    @Query("SELECT COUNT(b) FROM Batch b WHERE b.user.id = :userId AND b.currentCount > 0")
    Long countActiveBatchesByUserId(@Param("userId") Long userId);

    long deleteAllByLivestockId(Long livestockId);

    @Query("""
            SELECT new com.authapp.dto.DashboardBatchOptionDTO(
                b.id,
                b.name,
                b.livestock.type,
                b.currentCount
            )
            FROM Batch b
            WHERE b.currentCount > 0
            ORDER BY b.createdAt DESC
            """)
    List<DashboardBatchOptionDTO> findDashboardBatchOptions();

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(b.initialCount), 0)
            )
            FROM Batch b
            WHERE b.createdAt >= :since
            GROUP BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            """)
    List<com.authapp.dto.DailyLongMetricDTO> sumInitialCountByCreatedDaySince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(b.initialCount), 0)
            )
            FROM Batch b
            GROUP BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            """)
    List<com.authapp.dto.DailyLongMetricDTO> sumInitialCountByCreatedDayAllTime();

    @Query("""
            SELECT new com.authapp.dto.DailyLongMetricDTO(
                FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(b.initialCount), 0)
            )
            FROM Batch b
            WHERE b.createdAt >= :since
              AND b.livestock.id = :livestockId
            GROUP BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', b.createdAt, 'YYYY-MM-DD')
            """)
    List<com.authapp.dto.DailyLongMetricDTO> sumInitialCountByCreatedDaySinceAndLivestockId(
            @Param("livestockId") Long livestockId,
            @Param("since") LocalDateTime since
    );
}
