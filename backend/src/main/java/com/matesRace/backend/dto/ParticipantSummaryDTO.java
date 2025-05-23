// backend/src/main/java/com/matesRace/backend/dto/ParticipantSummaryDTO.java
package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantSummaryDTO {
    private Long id;
    private UserSummaryDTO user;
    private boolean submittedRide;
    private Long submittedActivityId;
    private List<ParticipantSegmentResultDTO> segmentResults;
}