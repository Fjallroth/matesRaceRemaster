package com.matesRace.backend.controller;

import com.matesRace.backend.dto.RaceCreateDTO;
import com.matesRace.backend.model.Race;
import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.RaceRepository;
import com.matesRace.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;


@RestController
@RequestMapping("/api/races") // Base path for race API endpoints
public class RaceApiController {

    private static final Logger logger = LoggerFactory.getLogger(RaceApiController.class);

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private UserRepository userRepository;

    // POST endpoint to create a new race
    @PostMapping
    public ResponseEntity<?> createRace(@RequestBody RaceCreateDTO raceDTO, @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }

        String stravaIdStr = oauth2User.getName(); // Strava ID is the principal name
        if (stravaIdStr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Could not determine user Strava ID");
        }

        long stravaId;
        try {
            stravaId = Long.parseLong(stravaIdStr);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Strava ID format");
        }

        Optional<User> organiserOpt = userRepository.findByStravaId(stravaId);
        if (!organiserOpt.isPresent()) {
            // This case should ideally not happen if the user is authenticated via our OAuth2 flow which saves the user
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Authenticated user not found in database");
        }
        User organiser = organiserOpt.get();

        // --- Input Validation ---
        if (raceDTO.getRaceName() == null || raceDTO.getRaceName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Race name is required");
        }
        if (raceDTO.getStartDate() == null || raceDTO.getEndDate() == null) {
            return ResponseEntity.badRequest().body("Start date and end date are required");
        }
        if (raceDTO.getSegmentIds() == null || raceDTO.getSegmentIds().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one segment ID is required");
        }
        if (!"public".equalsIgnoreCase(raceDTO.getPrivacy()) && !"private".equalsIgnoreCase(raceDTO.getPrivacy())) {
            return ResponseEntity.badRequest().body("Privacy must be 'public' or 'private'");
        }
        if ("private".equalsIgnoreCase(raceDTO.getPrivacy()) && (raceDTO.getPassword() == null || raceDTO.getPassword().length() < 4)) {
            return ResponseEntity.badRequest().body("Password is required for private races and must be at least 4 characters");
        }
        // --- End Validation ---


        Race newRace = new Race();
        newRace.setRaceName(raceDTO.getRaceName());
        newRace.setRaceInfo(raceDTO.getDescription()); // Map description to raceInfo

        try {
            newRace.setStartDate(Instant.parse(raceDTO.getStartDate()));
            newRace.setEndDate(Instant.parse(raceDTO.getEndDate()));
            if (newRace.getEndDate().isBefore(newRace.getStartDate())) {
                return ResponseEntity.badRequest().body("End date must be after start date");
            }
        } catch (Exception e) {
            logger.error("Error parsing dates: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid date format. Please use ISO 8601 format (e.g., yyyy-MM-ddTHH:mm:ss.SSSZ)");
        }

        newRace.setSegmentIds(raceDTO.getSegmentIds());
        newRace.setOrganiser(organiser);

        if ("private".equalsIgnoreCase(raceDTO.getPrivacy())) {
            newRace.setPassword(raceDTO.getPassword()); // Set password for private races
            newRace.setPrivate(true);
        } else {
            newRace.setPassword(null); // Ensure password is null for public races
            newRace.setPrivate(false);
        }

        try {
            Race savedRace = raceRepository.save(newRace);
            logger.info("Race created successfully with ID: {}", savedRace.getId());
            // Consider returning a RaceResponseDTO instead of the full entity
            return ResponseEntity.status(HttpStatus.CREATED).body(savedRace);
        } catch (Exception e) {
            logger.error("Error saving race: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create race due to server error");
        }
    }

    // GET endpoint to retrieve all races (adjust based on desired visibility)
    @GetMapping
    public ResponseEntity<List<Race>> getAllRaces(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            // Decide if public races should be visible without auth.
            // For now, require authentication to see any races.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        // In a real app, you'd likely filter races (e.g., only public/ongoing/upcoming)
        // and use pagination. You might also return a DTO instead of the full Race entity.
        List<Race> races = raceRepository.findAll(); // Fetches ALL races for now
        return ResponseEntity.ok(races);
    }

    // GET endpoint to retrieve a specific race by ID
    @GetMapping("/{id}")
    public ResponseEntity<Race> getRaceById(@PathVariable Long id, @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Optional<Race> raceOpt = raceRepository.findById(id);
        if (!raceOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Race not found");
        }

        Race race = raceOpt.get();

        // Add authorization check: Can this user view this race?
        // e.g., is it public? is the user the organiser? are they a participant?
        // For now, allow any authenticated user to see any race by ID.
        // if (race.isPrivate() && !isUserAllowedToViewPrivateRace(race, oauth2User)) {
        //     throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to view this race");
        // }

        return ResponseEntity.ok(race);
    }

    // Helper method placeholder for private race access check
    // private boolean isUserAllowedToViewPrivateRace(Race race, OAuth2User oauth2User) {
    //     // Implement logic: check if user is organiser, participant, etc.
    //     return true; // Placeholder
    // }
}