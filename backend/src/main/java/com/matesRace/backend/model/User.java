// src/main/java/com/matesRace/backend/model/User.java
package com.matesRace.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "users") // Assuming your table is named 'users'. Adjust if different.
public class User {

    @Id
    @Column(name = "strava_id", nullable = false, unique = true)
    private Long stravaId;

    @Column(name = "display_name")
    private String displayName;

    @Column(name = "user_sex")
    private String userSex; // M or F typically from Strava

    @Column(name = "user_city")
    private String userCity;

    @Column(name = "user_state")
    private String userState;

    @Column(name = "user_country")
    private String userCountry;

    // For Strava tokens (which are strings), use TEXT for potentially long values.
    @Column(name = "user_strava_access", columnDefinition = "TEXT")
    private String userStravaAccess;

    @Column(name = "user_strava_first_name")
    private String userStravaFirstName;

    @Column(name = "user_strava_last_name")
    private String userStravaLastName;

    @Column(name = "user_strava_pic", length = 512)
    private String userStravaPic;

    @Column(name = "user_strava_refresh", columnDefinition = "TEXT")
    private String userStravaRefresh;

    @Column(name = "user_token_expire")
    private LocalDateTime userTokenExpire;

    // Constructors
    public User() {
    }

    public User(Long stravaId, String displayName, String userStravaFirstName, String userStravaLastName, String userStravaPic, String userSex, String userCity, String userState, String userCountry) {
        this.stravaId = stravaId;
        this.displayName = displayName;
        this.userStravaFirstName = userStravaFirstName;
        this.userStravaLastName = userStravaLastName;
        this.userStravaPic = userStravaPic;
        this.userSex = userSex;
        this.userCity = userCity;
        this.userState = userState;
        this.userCountry = userCountry;
    }

    // Getters and Setters

    public Long getStravaId() {
        return stravaId;
    }

    public void setStravaId(Long stravaId) {
        this.stravaId = stravaId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getUserSex() {
        return userSex;
    }

    public void setUserSex(String userSex) {
        this.userSex = userSex;
    }

    public String getUserCity() {
        return userCity;
    }

    public void setUserCity(String userCity) {
        this.userCity = userCity;
    }

    public String getUserState() {
        return userState;
    }

    public void setUserState(String userState) {
        this.userState = userState;
    }

    public String getUserCountry() {
        return userCountry;
    }

    public void setUserCountry(String userCountry) {
        this.userCountry = userCountry;
    }

    public String getUserStravaAccess() {
        return userStravaAccess;
    }

    public void setUserStravaAccess(String userStravaAccess) {
        this.userStravaAccess = userStravaAccess;
    }

    public String getUserStravaFirstName() {
        return userStravaFirstName;
    }

    public void setUserStravaFirstName(String userStravaFirstName) {
        this.userStravaFirstName = userStravaFirstName;
    }

    public String getUserStravaLastName() {
        return userStravaLastName;
    }

    public void setUserStravaLastName(String userStravaLastName) {
        this.userStravaLastName = userStravaLastName;
    }

    public String getUserStravaPic() {
        return userStravaPic;
    }

    public void setUserStravaPic(String userStravaPic) {
        this.userStravaPic = userStravaPic;
    }

    public String getUserStravaRefresh() {
        return userStravaRefresh;
    }

    public void setUserStravaRefresh(String userStravaRefresh) {
        this.userStravaRefresh = userStravaRefresh;
    }

    public LocalDateTime getUserTokenExpire() {
        return userTokenExpire;
    }

    public void setUserTokenExpire(LocalDateTime userTokenExpire) {
        this.userTokenExpire = userTokenExpire;
    }

    @Override
    public String toString() {
        return "User{" +
                "stravaId=" + stravaId +
                ", displayName='" + displayName + '\'' +
                ", userSex='" + userSex + '\'' +
                ", userCity='" + userCity + '\'' +
                ", userState='" + userState + '\'' +
                ", userCountry='" + userCountry + '\'' +
                ", userStravaAccess='" + (userStravaAccess != null ? "[PROTECTED_ACCESS_TOKEN]" : "null") + '\'' +
                ", userStravaFirstName='" + userStravaFirstName + '\'' +
                ", userStravaLastName='" + userStravaLastName + '\'' +
                ", userStravaPic='" + userStravaPic + '\'' +
                ", userStravaRefresh='" + (userStravaRefresh != null ? "[PROTECTED_REFRESH_TOKEN]" : "null") + '\'' +
                ", userTokenExpire=" + userTokenExpire +
                '}';
    }
}