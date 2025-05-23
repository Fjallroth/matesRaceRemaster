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
    private String startDate;
    private String endDate;
    private List<Long> segmentIds;
    private UserSummaryDTO organiser;
    private boolean isPrivate;
    private boolean hideLeaderboardUntilFinish;
    private boolean useSexCategories;
    private List<ParticipantSummaryDTO> participants; // Can be null for list views
    private int participantCount;
    private String password;
}