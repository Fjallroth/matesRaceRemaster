package com.matesRace.backend.repository;

import com.matesRace.backend.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    Optional<Participant> findByRaceIdAndUserStravaId(Long raceId, Long userStravaId);

}