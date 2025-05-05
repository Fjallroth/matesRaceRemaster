//participants not stored here as they were previously an array of objects. This wont work in SQL
package com.matesRace.backend.model;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.matesRace.backend.model.SegmentIdentifier;
import java.util.ArrayList;
import java.util.List;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table

public class Race {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String raceName;

    @Column(nullable = false)
    private Instant startDate;

    @Column(nullable = false)
    private Instant endDate;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "race_segment_ids", joinColumns = @JoinColumn(name = "race_id"))
    @Column(name = "segment_id", nullable = false)
    private List<Long> segmentIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "race_segments", joinColumns = @JoinColumn(name = "race_id"))
    private List<SegmentIdentifier> segments = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organiser_strava_id", referencedColumnName = "stravaId", nullable = false) // FK column in Race table, references PK ('stravaId') in User table
    private User organiser;

    @Column(name = "participation_password", nullable = false)
    private String participationPassword;

    @Lob
    private String raceInfo;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "race_join_requests", // Name of the intermediate join table
            joinColumns = @JoinColumn(name = "race_id"), // FK column in join table linking to Race
            inverseJoinColumns = @JoinColumn(name = "user_strava_id", referencedColumnName = "stravaId") // FK column linking to User (using stravaId)
    )
    private Set<User> joinRequesters = new HashSet<>();

    @OneToMany(mappedBy = "race", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Participant> participants = new ArrayList<>();

}