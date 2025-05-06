package com.matesRace.backend.repository;

import com.matesRace.backend.model.ParticipantSegmentResult; // Assuming singular class name
import org.springframework.data.jpa.repository.JpaRepository;


public interface ParticipantSegmentResultRepository extends JpaRepository<ParticipantSegmentResult, Long> {

}
