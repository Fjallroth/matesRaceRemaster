package com.matesRace.backend.repository;

import com.matesRace.backend.model.ParticipantSegmentResult; // Assuming singular class name
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface ParticipantSegmentResultRepository extends JpaRepository<ParticipantSegmentResult, Long> {
    List<ParticipantSegmentResult> findByParticipantId(Long participantId); // To find all for deletion
    void deleteByParticipantId(Long participantId);
}
