package com.matesRace.backend.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "participants")
public class Participant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Unique ID for the participation record

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "race_id", nullable = false)
    private Race race; // Link back to the Race

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_strava_id", referencedColumnName = "strava_id") // Link to the User
    private User user;

    @Column(nullable = false)
    private boolean submittedRide = false;

    private Long submittedActivityId; // Store the ID of the submitted Strava activity


    @OneToMany(mappedBy = "participant", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<ParticipantSegmentResult> segmentResults = new ArrayList<>();


}

