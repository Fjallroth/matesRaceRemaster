package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantSummaryDTO {
    private Long id; // Participant record ID
    private UserSummaryDTO user;
    private boolean submittedRide;
    private Long submittedActivityId; // Optional: can be null
}