package com.matesRace.backend.repository;

import com.matesRace.backend.model.Race;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RaceRepository extends JpaRepository<Race, Long> {

    // EntityGraph to fetch related entities for detailed view of a single race by ID
    @EntityGraph(attributePaths = {"organiser", "participants", "participants.user"})
    @Override // Good practice to add @Override if overriding a method from JpaRepository
    Optional<Race> findById(Long id);

    // Fetch races where the user is a participant
    // Corrected: Added FETCH for r.participants
    @Query("SELECT DISTINCT r FROM Race r LEFT JOIN FETCH r.organiser LEFT JOIN FETCH r.participants p LEFT JOIN FETCH p.user WHERE p.user.stravaId = :stravaId")
    List<Race> findRacesByParticipantStravaId(@Param("stravaId") Long stravaId);

    // Query to get participant count for a specific race
    @Query("SELECT COUNT(p) FROM Participant p WHERE p.race.id = :raceId")
    Integer getParticipantCountForRace(@Param("raceId") Long raceId);
}