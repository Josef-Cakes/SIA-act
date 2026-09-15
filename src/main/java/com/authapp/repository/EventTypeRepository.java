package com.authapp.repository;

import com.authapp.entity.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventTypeRepository extends JpaRepository<EventType, Long> {

    Optional<EventType> findByCode(String code);

    @Query("SELECT et FROM EventType et WHERE et.active = true")
    List<EventType> findActiveEventTypes();

    @Query("SELECT et FROM EventType et WHERE et.affectsCount = :affectsCount")
    List<EventType> findByAffectsCount(@Param("affectsCount") Boolean affectsCount);

    boolean existsByCode(String code);
}
