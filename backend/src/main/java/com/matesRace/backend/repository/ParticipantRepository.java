package com.matesRace.backend.repository;

import com.matesRace.backend.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;


public interface ParticipantRepository extends JpaRepository<Participant, Long> {

}