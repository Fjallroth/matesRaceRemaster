package com.matesRace.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users") //
public class User {

    @Id
    @Column(nullable = false, unique = true)
    private Long stravaId;

    @Column(length = 255)
    private String displayName;


    @Column(length = 1000)
    private String userStravaToken;

    @Column(length = 1000)
    private String userStravaAccess;

    @Column(length = 1000)
    private String userStravaRefresh;

    @Column(length = 255)
    private String userStravaFirstName;

    @Column(length = 255)
    private String userStravaLastName;

    @Column(length = 500)
    private String userStravaPic;

    @Column(length = 255)
    private String email;


    private Instant userTokenExpire;

    @Column(length = 10)
    private String userSex;

}