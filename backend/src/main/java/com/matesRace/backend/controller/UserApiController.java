package com.matesRace.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api") // Base path for API endpoints
public class UserApiController {

    @GetMapping("/user/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            // If oauth2User is null, the user is not authenticated via OAuth2 session
            return ResponseEntity.status(401).body(Map.of("message", "Not Authenticated"));
        }

        // Extract desired attributes. Adjust keys based on what Strava provides and what your frontend needs.
        // The 'id' is used as the principal name (due to user-name-attribute=id).
        // 'firstname', 'lastname', 'profile' (for profile picture) are common attributes from Strava.
        Map<String, Object> userAttributes = oauth2User.getAttributes();
        Map<String, Object> responseDetails = new HashMap<>();

        responseDetails.put("name", oauth2User.getName()); // This will be the Strava ID
        responseDetails.put("stravaId", oauth2User.getName()); // Explicitly add Strava ID

        // Check for attribute existence before getting them to avoid NullPointerExceptions
        if (userAttributes.containsKey("firstname")) {
            responseDetails.put("firstName", userAttributes.get("firstname"));
        }
        if (userAttributes.containsKey("lastname")) {
            responseDetails.put("lastName", userAttributes.get("lastname"));
        }
        if (userAttributes.containsKey("profile")) { // Often the URL for the large profile picture
            responseDetails.put("profilePicture", userAttributes.get("profile"));
        } else if (userAttributes.containsKey("profile_medium")) { // Or medium
            responseDetails.put("profilePicture", userAttributes.get("profile_medium"));
        }
        // Add any other attributes your frontend might need, e.g., email if scope permits and available
        // responseDetails.put("email", userAttributes.get("email"));


        // You can log the full attributes to see what's available from Strava
        // System.out.println("Strava User Attributes: " + userAttributes);

        return ResponseEntity.ok(responseDetails);
    }
}