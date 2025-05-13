// backend/src/main/java/com/matesRace/backend/model/ParticipantSegmentResult.java
package com.matesRace.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor; // Add if needed
import lombok.Data; // Add if not present
import lombok.NoArgsConstructor; // Add if not present

@Entity
@Table(name = "participant_segment_results")
@Data // Ensures getters, setters, toString, equals, hashCode
@NoArgsConstructor
@AllArgsConstructor // Useful for easy construction
public class ParticipantSegmentResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;

    @Column(nullable = false)
    private Long segmentId;

    private String segmentName;

    private Integer elapsedTimeSeconds;

    // Lombok will generate constructors, getters, setters
}