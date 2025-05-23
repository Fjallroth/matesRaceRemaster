// backend/src/main/java/com/matesRace/backend/controller/UserApiController.java
package com.matesRace.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api") // Base path for API endpoints
public class UserApiController {

    @GetMapping("/user/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Not Authenticated"));
        }

        Map<String, Object> userAttributes = oauth2User.getAttributes();
        Map<String, Object> responseDetails = new HashMap<>();

        responseDetails.put("name", oauth2User.getName());
        responseDetails.put("stravaId", oauth2User.getName());

        if (userAttributes.containsKey("firstname")) {
            responseDetails.put("firstName", userAttributes.get("firstname"));
        }
        if (userAttributes.containsKey("lastname")) {
            responseDetails.put("lastName", userAttributes.get("lastname"));
        }
        if (userAttributes.containsKey("profile")) {
            responseDetails.put("profilePicture", userAttributes.get("profile"));
        } else if (userAttributes.containsKey("profile_medium")) {
            responseDetails.put("profilePicture", userAttributes.get("profile_medium"));
        }

        // Add new fields
        if (userAttributes.containsKey("sex")) {
            responseDetails.put("sex", userAttributes.get("sex")); // e.g., "M" or "F"
        }
        if (userAttributes.containsKey("city")) {
            responseDetails.put("city", userAttributes.get("city"));
        }
        if (userAttributes.containsKey("state")) {
            responseDetails.put("state", userAttributes.get("state"));
        }
        if (userAttributes.containsKey("country")) {
            responseDetails.put("country", userAttributes.get("country"));
        }
        // Strava does not typically provide 'age' directly.
        // If you have 'date_preference' (MM/DD/YYYY) or 'birthdate' from a specific scope, you could calculate age.
        // For now, we assume age is not directly available.

        return ResponseEntity.ok(responseDetails);
    }
}