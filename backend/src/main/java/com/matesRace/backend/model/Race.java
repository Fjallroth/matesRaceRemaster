package com.matesRace.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "races")
public class Race {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String raceName;

    @Column(columnDefinition = "TEXT")
    private String raceInfo;

    @Column(nullable = false)
    private Instant startDate;

    @Column(nullable = false)
    private Instant endDate;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "race_segment_ids", joinColumns = @JoinColumn(name = "race_id"))
    @Column(name = "segment_id", nullable = false)
    private List<Long> segmentIds = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organiser_strava_id", referencedColumnName = "strava_Id", nullable = false)
    private User organiser;

    @Column(name = "password", nullable = true) // Will be required if isPrivate is true
    private String password;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT TRUE") // Default to true
    private boolean isPrivate = true; // Now defaults to true

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private boolean hideLeaderboardUntilFinish = false;

    @Column(nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE") // New field
    private boolean useSexCategories = false;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "race_join_requests",
            joinColumns = @JoinColumn(name = "race_id"),
            inverseJoinColumns = @JoinColumn(name = "user_strava_id", referencedColumnName = "strava_id")
    )
    private Set<User> joinRequesters = new HashSet<>();

    @OneToMany(mappedBy = "race", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Participant> participants = new ArrayList<>();

}