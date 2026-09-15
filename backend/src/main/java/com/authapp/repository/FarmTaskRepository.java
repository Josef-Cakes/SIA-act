package com.authapp.repository;

import com.authapp.entity.FarmTask;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FarmTaskRepository extends JpaRepository<FarmTask, Long> {

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    List<FarmTask> findByAssignedUserIdOrderByDueAtAscCreatedAtDesc(Long assignedUserId);

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    List<FarmTask> findAllByOrderByDueAtAscCreatedAtDesc();

    @EntityGraph(attributePaths = {"assignedUser", "batch"})
    @Override
    Optional<FarmTask> findById(Long id);

    boolean existsByTaskKey(String taskKey);
}
