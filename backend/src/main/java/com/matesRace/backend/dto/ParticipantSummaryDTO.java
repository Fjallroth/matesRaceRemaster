// backend/src/main/java/com/matesRace/backend/dto/ParticipantSummaryDTO.java
package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List; // <-- Import List

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantSummaryDTO {
    private Long id; // Participant record ID
    private UserSummaryDTO user;
    private boolean submittedRide;
    private Long submittedActivityId; // Optional: can be null
    private List<ParticipantSegmentResultDTO> segmentResults; // <-- ADDED for leaderboard
}