package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDTO {
    private Long stravaId;
    private String displayName;
    private String userStravaFirstName;
    private String userStravaLastName;
    private String userStravaPic;
    private String userSex;
}