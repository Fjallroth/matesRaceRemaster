package com.matesRace.backend.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "participants")
public class Participant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Unique ID for the participation record

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", nullable = false)
    private Race race; // Link back to the Race

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_strava_id", referencedColumnName = "stravaId", nullable = false) // Link to the User
    private User user;

    @Column(nullable = false)
    private boolean submittedRide = false;

    private Long submittedActivityId; // Store the ID of the submitted Strava activity


    @OneToMany(mappedBy = "participant", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ParticipantSegmentResult> segmentResults = new ArrayList<>();


}

