package com.authapp.repository;

import com.authapp.dto.LivestockSummaryDTO;
import com.authapp.entity.Livestock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LivestockRepository extends JpaRepository<Livestock, Long> {

    Optional<Livestock> findByType(String type);

    Optional<Livestock> findByTypeIgnoreCase(String type);

    boolean existsByType(String type);

    boolean existsByTypeIgnoreCase(String type);

    @Query("""
            SELECT new com.authapp.dto.LivestockSummaryDTO(
                l.id,
                l.type,
                COUNT(b),
                COALESCE(SUM(b.currentCount), 0)
            )
            FROM Livestock l
            LEFT JOIN l.batches b
                ON b.currentCount > 0
               AND (b.status IS NULL OR UPPER(b.status) <> 'ARCHIVED')
            GROUP BY l.id, l.type
            ORDER BY l.type ASC
            """)
    List<LivestockSummaryDTO> findLivestockSummaries();
}
