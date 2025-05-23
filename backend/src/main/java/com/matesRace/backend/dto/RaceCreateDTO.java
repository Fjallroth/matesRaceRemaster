package com.matesRace.backend.dto;

import lombok.Data;
import java.util.List;

@Data
public class RaceCreateDTO {
    private String raceName;
    private String description;
    private String startDate;
    private String endDate;
    private List<Long> segmentIds;
    private String password;
    private boolean hideLeaderboardUntilFinish;
    private boolean useSexCategories;

}