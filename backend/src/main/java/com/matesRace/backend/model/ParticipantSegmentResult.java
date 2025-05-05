package com.matesRace.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "participant_segment_results")
public class ParticipantSegmentResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant; // Link back to the specific participation

    @Column(nullable = false)
    private Long segmentId; // Strava Segment ID

    private String segmentName; // Name of the segment

    private Integer elapsedTimeSeconds; // Time taken for this segment


}