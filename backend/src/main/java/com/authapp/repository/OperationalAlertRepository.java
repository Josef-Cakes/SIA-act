package com.authapp.repository;

import com.authapp.entity.OperationalAlert;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OperationalAlertRepository extends JpaRepository<OperationalAlert, Long> {

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    List<OperationalAlert> findByAssignedUserIdAndStatusNotOrderByDueAtAscCreatedAtDesc(Long assignedUserId, String status);

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    List<OperationalAlert> findAllByStatusNotOrderByDueAtAscCreatedAtDesc(String status);

    long countByStatusNot(String status);

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    @Override
    Optional<OperationalAlert> findById(Long id);
}
