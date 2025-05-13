// backend/src/main/java/com/matesRace/backend/dto/StravaActivityDTO.java
package com.matesRace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StravaActivityDTO {
    private Long id;
    private String name;
    private String startDateLocal; // ISO 8601 format
    private Double distance; // in meters
    private Integer elapsedTime; // in seconds
    private String type; // Ride, Run etc.
}