package com.authapp.repository;

import com.authapp.dto.ActivityTrendPointDTO;
import com.authapp.entity.ActivityLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findAllByOrderByTimestampDesc(Pageable pageable);

    List<ActivityLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);

    List<ActivityLog> findByUserIdOrderByTimestampDesc(Long userId);

    List<ActivityLog> findByUserIdAndTimestampGreaterThanEqualOrderByTimestampDesc(Long userId, LocalDateTime startDateTime);

    List<ActivityLog> findByUserIdAndTimestampLessThanOrderByTimestampDesc(Long userId, LocalDateTime endDateTime);

    List<ActivityLog> findByUserIdAndTimestampGreaterThanEqualAndTimestampLessThanOrderByTimestampDesc(
            Long userId,
            LocalDateTime startDateTime,
            LocalDateTime endDateTime
    );

    default List<ActivityLog> findFilteredByUserId(Long userId, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        if (startDateTime != null && endDateTime != null) {
            return findByUserIdAndTimestampGreaterThanEqualAndTimestampLessThanOrderByTimestampDesc(
                    userId,
                    startDateTime,
                    endDateTime
            );
        }

        if (startDateTime != null) {
            return findByUserIdAndTimestampGreaterThanEqualOrderByTimestampDesc(userId, startDateTime);
        }

        if (endDateTime != null) {
            return findByUserIdAndTimestampLessThanOrderByTimestampDesc(userId, endDateTime);
        }

        return findByUserIdOrderByTimestampDesc(userId);
    }

    List<ActivityLog> findByActionContainingIgnoreCaseOrderByTimestampAsc(String keyword);

    List<ActivityLog> findByActionContainingIgnoreCaseAndTimestampGreaterThanEqualOrderByTimestampAsc(String keyword, LocalDateTime since);

    long countByUserIdAndTimestampAfter(Long userId, LocalDateTime since);

    @Query("""
            SELECT MIN(al.timestamp)
            FROM ActivityLog al
            WHERE LOWER(al.action) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    LocalDateTime findEarliestTimestampByActionKeyword(@Param("keyword") String keyword);

    @Query("""
            SELECT new com.authapp.dto.ActivityTrendPointDTO(
                FUNCTION('TO_CHAR', al.timestamp, 'YYYY-MM-DD'),
                COUNT(al)
            )
            FROM ActivityLog al
            WHERE al.timestamp >= :since
            GROUP BY FUNCTION('TO_CHAR', al.timestamp, 'YYYY-MM-DD')
            ORDER BY FUNCTION('TO_CHAR', al.timestamp, 'YYYY-MM-DD')
            """)
    List<ActivityTrendPointDTO> findDailyTrendSince(@Param("since") LocalDateTime since);
}
