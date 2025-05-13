// backend/src/main/java/com/matesRace/backend/dto/ParticipantSegmentResultDTO.java
package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ParticipantSegmentResultDTO {
    private Long segmentId;
    private String segmentName; // Optional: can be populated if available
    private Integer elapsedTimeSeconds;
}