package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RaceResponseDTO {
    private Long id;
    private String raceName;
    private String raceInfo;
    private String startDate; // ISO 8601 string
    private String endDate;   // ISO 8601 string
    private List<Long> segmentIds;
    private UserSummaryDTO organiser;
    private boolean isPrivate;
    // private String password; // Generally not sent unless for specific authorized actions
    private List<ParticipantSummaryDTO> participants; // Can be null for list views
    private int participantCount;
}