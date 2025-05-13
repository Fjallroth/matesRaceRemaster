// backend/src/main/java/com/matesRace/backend/controller/RaceApiController.java
package com.matesRace.backend.controller;

import com.matesRace.backend.dto.RaceCreateDTO;
import com.matesRace.backend.dto.RaceResponseDTO;
import com.matesRace.backend.dto.ParticipantSummaryDTO;
import com.matesRace.backend.dto.UserSummaryDTO;
import com.matesRace.backend.dto.JoinRaceRequestDto;
import com.matesRace.backend.model.Participant;
import com.matesRace.backend.model.Race;
import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.RaceRepository;
import com.matesRace.backend.repository.UserRepository;
import com.matesRace.backend.repository.ParticipantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/races")
public class RaceApiController {

    private static final Logger logger = LoggerFactory.getLogger(RaceApiController.class);

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @PostMapping
    @Transactional
    public ResponseEntity<?> createRace(@RequestBody RaceCreateDTO raceDTO, @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }

        String stravaIdStr = oauth2User.getName();
        if (stravaIdStr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Could not determine user Strava ID");
        }

        long stravaId;
        try {
            stravaId = Long.parseLong(stravaIdStr);
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format in createRace: {}", stravaIdStr);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid Strava ID format");
        }

        Optional<User> organiserOpt = userRepository.findByStravaId(stravaId);
        if (!organiserOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Authenticated user not found in database");
        }
        User organiser = organiserOpt.get();

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

        Race newRace = new Race();
        newRace.setRaceName(raceDTO.getRaceName());
        newRace.setRaceInfo(raceDTO.getDescription());

        try {
            newRace.setStartDate(Instant.parse(raceDTO.getStartDate()));
            newRace.setEndDate(Instant.parse(raceDTO.getEndDate()));
            if (newRace.getEndDate().isBefore(newRace.getStartDate())) {
                return ResponseEntity.badRequest().body("End date must be after start date");
            }
        } catch (Exception e) {
            logger.error("Error parsing dates for new race: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Invalid date format. Please use ISO 8601 format (e.g., yyyy-MM-ddTHH:mm:ss.SSSZ)");
        }

        newRace.setSegmentIds(raceDTO.getSegmentIds());
        newRace.setOrganiser(organiser);

        if ("private".equalsIgnoreCase(raceDTO.getPrivacy())) {
            newRace.setPassword(raceDTO.getPassword());
            newRace.setPrivate(true);
        } else {
            newRace.setPassword(null);
            newRace.setPrivate(false);
        }

        try {
            Race savedRace = raceRepository.save(newRace);
            logger.info("Race created successfully with ID: {}", savedRace.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(convertToRaceResponseDTO(savedRace, true));
        } catch (Exception e) {
            logger.error("Error saving race: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create race due to server error");
        }
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<RaceResponseDTO>> getAllRaces(@AuthenticationPrincipal OAuth2User oauth2User) {
        List<Race> races = raceRepository.findAll();
        List<RaceResponseDTO> raceDTOs = races.stream()
                .map(race -> convertToRaceResponseDTO(race, false))
                .collect(Collectors.toList());
        return ResponseEntity.ok(raceDTOs);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<RaceResponseDTO> getRaceById(@PathVariable Long id, @AuthenticationPrincipal OAuth2User oauth2User) {
        Optional<Race> raceOpt = raceRepository.findById(id);
        if (!raceOpt.isPresent()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Race not found with ID: " + id);
        }
        Race race = raceOpt.get();
        return ResponseEntity.ok(convertToRaceResponseDTO(race, true));
    }

    @GetMapping("/participating")
    @Transactional(readOnly = true)
    public ResponseEntity<List<RaceResponseDTO>> getParticipatingRaces(@AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        long stravaId;
        try {
            stravaId = Long.parseLong(oauth2User.getName());
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format for current user in getParticipatingRaces: {}", oauth2User.getName());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Strava ID format for current user.");
        }

        List<Race> races = raceRepository.findRacesByParticipantStravaId(stravaId);
        List<RaceResponseDTO> raceDTOs = races.stream()
                .map(race -> convertToRaceResponseDTO(race, false))
                .collect(Collectors.toList());
        return ResponseEntity.ok(raceDTOs);
    }

    @PostMapping("/{raceId}/join")
    @Transactional
    public ResponseEntity<?> joinRace(@PathVariable Long raceId,
                                      @RequestBody JoinRaceRequestDto joinRequest,
                                      @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            logger.warn("Join attempt for race {} without authentication.", raceId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        long userStravaId;
        try {
            userStravaId = Long.parseLong(oauth2User.getName());
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format for joining user: {}", oauth2User.getName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid user ID format.");
        }

        Optional<User> userOpt = userRepository.findByStravaId(userStravaId);
        if (!userOpt.isPresent()) {
            logger.error("Authenticated user with Strava ID {} not found in database.", userStravaId);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("User not found.");
        }
        User user = userOpt.get();

        Optional<Race> raceOpt = raceRepository.findById(raceId);
        if (!raceOpt.isPresent()) {
            logger.warn("Join attempt for non-existent race ID: {}", raceId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Race not found.");
        }
        Race race = raceOpt.get();

        // Check if already a participant
        boolean alreadyParticipant = race.getParticipants().stream()
                .anyMatch(p -> p.getUser().getStravaId().equals(userStravaId));
        if (alreadyParticipant) {
            logger.info("User {} already a participant in race {}.", userStravaId, raceId);
            return ResponseEntity.status(HttpStatus.CONFLICT).body("You are already a participant in this race.");
        }

        // REMOVED: Logic that prevented organisers from joining their own race
        // if (race.getOrganiser() != null && race.getOrganiser().getStravaId().equals(userStravaId)) {
        //     logger.info("Organiser {} attempted to join their own race {} as participant.", userStravaId, raceId);
        //     return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Organisers cannot join their own race as a participant.");
        // }

        if (race.isPrivate()) {
            if (joinRequest.getPassword() == null || !joinRequest.getPassword().equals(race.getPassword())) {
                logger.warn("Incorrect password attempt for private race {} by user {}.", raceId, userStravaId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Incorrect password for private race.");
            }
        }

        Participant newParticipant = new Participant();
        newParticipant.setRace(race);
        newParticipant.setUser(user);
        newParticipant.setSubmittedRide(false);

        try {
            Participant savedParticipant = participantRepository.save(newParticipant);
            logger.info("User {} successfully joined race {}.", userStravaId, raceId);
            return ResponseEntity.ok(convertToParticipantSummaryDTO(savedParticipant));
        } catch (Exception e) {
            logger.error("Error saving participant for race {}: {}", raceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not join race due to a server error.");
        }
    }


    private UserSummaryDTO convertToUserSummaryDTO(User user) {
        if (user == null) {
            return null;
        }
        return new UserSummaryDTO(
                user.getStravaId(),
                user.getDisplayName(),
                user.getUserStravaFirstName(),
                user.getUserStravaLastName(),
                user.getUserStravaPic()
        );
    }

    private ParticipantSummaryDTO convertToParticipantSummaryDTO(Participant participant) {
        if (participant == null) {
            return null;
        }
        return new ParticipantSummaryDTO(
                participant.getId(),
                convertToUserSummaryDTO(participant.getUser()),
                participant.isSubmittedRide(),
                participant.getSubmittedActivityId()
        );
    }

    private RaceResponseDTO convertToRaceResponseDTO(Race race, boolean includeParticipantsDetails) {
        if (race == null) {
            return null;
        }

        List<ParticipantSummaryDTO> participantDTOs = Collections.emptyList();
        int participantCount = 0;

        if (race.getParticipants() != null) {
            participantCount = race.getParticipants().size();
            if (includeParticipantsDetails) {
                participantDTOs = race.getParticipants().stream()
                        .map(this::convertToParticipantSummaryDTO)
                        .collect(Collectors.toList());
            }
        } else if (race.getId() != null) {
            Integer countFromRepo = raceRepository.getParticipantCountForRace(race.getId());
            participantCount = (countFromRepo != null) ? countFromRepo : 0;
        }

        return new RaceResponseDTO(
                race.getId(),
                race.getRaceName(),
                race.getRaceInfo(),
                race.getStartDate() != null ? race.getStartDate().toString() : null,
                race.getEndDate() != null ? race.getEndDate().toString() : null,
                race.getSegmentIds(),
                convertToUserSummaryDTO(race.getOrganiser()),
                race.isPrivate(),
                includeParticipantsDetails ? participantDTOs : null,
                participantCount
        );
    }
}