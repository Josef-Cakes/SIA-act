package com.authapp.repository;

import com.authapp.dto.DailyDoubleMetricDTO;
import com.authapp.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<Sale> findByBatchIdOrderByCreatedAtDesc(Long batchId);

    long deleteAllByBatchId(Long batchId);

    @Modifying
    @Query("UPDATE Sale s SET s.batch = null WHERE s.batch.id = :batchId")
    int detachBatchReferences(@Param("batchId") Long batchId);

    List<Sale> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT s FROM Sale s WHERE s.createdAt BETWEEN :startDate AND :endDate")
    List<Sale> findByDateRange(@Param("startDate") LocalDateTime startDate,
                              @Param("endDate") LocalDateTime endDate);

    @Query("SELECT SUM(s.totalAmount) FROM Sale s WHERE s.createdAt BETWEEN :startDate AND :endDate")
    Double calculateTotalSalesAmount(@Param("startDate") LocalDateTime startDate,
                                   @Param("endDate") LocalDateTime endDate);

    @Query("SELECT SUM(s.quantity) FROM Sale s WHERE s.batch.id = :batchId")
    Integer calculateTotalQuantitySoldForBatch(@Param("batchId") Long batchId);

    @Query("SELECT COALESCE(SUM(s.totalAmount), 0.0) FROM Sale s")
    Double calculateRevenueToDate();

    @Query("""
            SELECT new com.authapp.dto.DailyDoubleMetricDTO(
                FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(s.totalAmount), 0.0)
            )
            FROM Sale s
            WHERE s.createdAt >= :since
            GROUP BY FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyDoubleMetricDTO> sumRevenueByDaySince(@Param("since") LocalDateTime since);

    @Query("""
            SELECT new com.authapp.dto.DailyDoubleMetricDTO(
                FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD'),
                COALESCE(SUM(s.totalAmount), 0.0)
            )
            FROM Sale s
            GROUP BY FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', s.createdAt, 'YYYY-MM-DD')
            """)
    List<DailyDoubleMetricDTO> sumRevenueByDayAllTime();

    @Query("SELECT MIN(s.createdAt) FROM Sale s")
    LocalDateTime findEarliestCreatedAt();
}
