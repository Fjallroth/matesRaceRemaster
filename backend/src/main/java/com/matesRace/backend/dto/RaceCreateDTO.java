package com.matesRace.backend.dto;

import lombok.Data;
import java.util.List;

@Data // Adds getters, setters, toString, equals, hashCode
public class RaceCreateDTO {
    private String raceName;
    private String description; // Mapped to raceInfo in Race entity
    private String startDate; // Expecting ISO 8601 format string (e.g., "2025-05-15T10:00:00.000Z")
    private String endDate;   // Expecting ISO 8601 format string
    private List<Long> segmentIds; // Changed from segments (List<String>) in frontend form
    private String privacy; // "public" or "private"
    private String password; // Required if privacy is "private"
    // Categories can be added later if needed based on frontend fields
}