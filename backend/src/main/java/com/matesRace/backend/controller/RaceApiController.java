package com.matesRace.backend.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.matesRace.backend.dto.ParticipantSegmentResultDTO;
import com.matesRace.backend.dto.StravaActivityDTO;
import com.matesRace.backend.dto.SubmitActivityRequestDTO;
import com.matesRace.backend.model.ParticipantSegmentResult;
import com.matesRace.backend.dto.RaceCreateDTO;
import com.matesRace.backend.dto.RaceResponseDTO;
import com.matesRace.backend.dto.ParticipantSummaryDTO;
import com.matesRace.backend.dto.UserSummaryDTO;
import com.matesRace.backend.dto.JoinRaceRequestDto;
import com.matesRace.backend.model.Participant;
import com.matesRace.backend.model.Race;
import com.matesRace.backend.model.User;
import com.matesRace.backend.service.StravaService;
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
import org.hibernate.Hibernate;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.ArrayList;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/races")
public class RaceApiController {

    private static final Logger logger = LoggerFactory.getLogger(RaceApiController.class);

    @Autowired
    private RaceRepository raceRepository;

    @Autowired
    private StravaService stravaService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParticipantRepository participantRepository;

    @PersistenceContext
    private EntityManager entityManager;


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
        // Force private race, so password is required
        if (raceDTO.getPassword() == null || raceDTO.getPassword().length() < 4) {
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
        newRace.setHideLeaderboardUntilFinish(raceDTO.isHideLeaderboardUntilFinish());
        newRace.setUseSexCategories(raceDTO.isUseSexCategories()); // Set new field

        // Force private
        newRace.setPrivate(true);
        newRace.setPassword(raceDTO.getPassword());


        try {
            Race savedRace = raceRepository.save(newRace);
            logger.info("Race created successfully with ID: {}", savedRace.getId());

            Participant organiserParticipant = new Participant();
            organiserParticipant.setRace(savedRace);
            organiserParticipant.setUser(organiser);
            organiserParticipant.setSubmittedRide(false);
            participantRepository.save(organiserParticipant);
            logger.info("Organiser {} automatically added as participant to race {}", organiser.getStravaId(), savedRace.getId());

            Race raceWithOrganiserAsParticipant = raceRepository.findById(savedRace.getId()).orElse(savedRace);
            // Initialize for DTO
            Hibernate.initialize(raceWithOrganiserAsParticipant.getOrganiser());
            Hibernate.initialize(raceWithOrganiserAsParticipant.getParticipants());
            raceWithOrganiserAsParticipant.getParticipants().forEach(p -> {
                Hibernate.initialize(p.getUser());
                Hibernate.initialize(p.getSegmentResults());
            });


            return ResponseEntity.status(HttpStatus.CREATED).body(convertToRaceResponseDTO(raceWithOrganiserAsParticipant, true, oauth2User));
        } catch (Exception e) {
            logger.error("Error saving race or adding organiser as participant: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to create race due to server error");
        }
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<RaceResponseDTO>> getAllRaces(@AuthenticationPrincipal OAuth2User oauth2User) {
        List<Race> races = raceRepository.findAll();
        List<RaceResponseDTO> raceDTOs = races.stream()
                .map(race -> {
                    Hibernate.initialize(race.getOrganiser());
                    Hibernate.initialize(race.getParticipants());
                    race.getParticipants().forEach(p -> {
                        Hibernate.initialize(p.getUser());
                        Hibernate.initialize(p.getSegmentResults());
                    });
                    return convertToRaceResponseDTO(race, false, oauth2User);
                })
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
        Hibernate.initialize(race.getOrganiser());
        Hibernate.initialize(race.getParticipants());
        race.getParticipants().forEach(p -> {
            Hibernate.initialize(p.getUser());
            Hibernate.initialize(p.getSegmentResults());
        });
        return ResponseEntity.ok(convertToRaceResponseDTO(race, true, oauth2User));
    }


    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> editRace(@PathVariable Long id, @RequestBody RaceCreateDTO raceUpdateDTO, @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
        }
        String stravaIdStr = oauth2User.getName();
        if (stravaIdStr == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Could not determine user Strava ID");
        }
        long userStravaId;
        try {
            userStravaId = Long.parseLong(stravaIdStr);
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format in editRace for user: {}", stravaIdStr);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid user Strava ID format");
        }

        Optional<Race> raceOpt = raceRepository.findById(id);
        if (!raceOpt.isPresent()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Race not found with ID: " + id);
        }
        Race raceToUpdate = raceOpt.get();
        Hibernate.initialize(raceToUpdate.getOrganiser());

        if (raceToUpdate.getOrganiser() == null || !raceToUpdate.getOrganiser().getStravaId().equals(userStravaId) ) {
            logger.warn("User {} attempted to edit race {} not owned by them.", userStravaId, id);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to edit this race.");
        }

        if (raceUpdateDTO.getRaceName() == null || raceUpdateDTO.getRaceName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Race name is required");
        }
        if (raceUpdateDTO.getStartDate() == null || raceUpdateDTO.getEndDate() == null) {
            return ResponseEntity.badRequest().body("Start date and end date are required");
        }
        if (raceUpdateDTO.getSegmentIds() == null || raceUpdateDTO.getSegmentIds().isEmpty()) {
            return ResponseEntity.badRequest().body("At least one segment ID is required");
        }

        // Race is always private, password can be updated if provided
        if (raceUpdateDTO.getPassword() != null && !raceUpdateDTO.getPassword().isEmpty()) {
            if (raceUpdateDTO.getPassword().length() < 4) {
                return ResponseEntity.badRequest().body("New password must be at least 4 characters.");
            }
            raceToUpdate.setPassword(raceUpdateDTO.getPassword());
        } else if (raceToUpdate.getPassword() == null || raceToUpdate.getPassword().isEmpty()){
            //This will only be hit if an old race somehow has no password and the edit doesn't provide one.
            //New races are forced to have a password.
            return ResponseEntity.badRequest().body("A password is required for this race.");
        }
        raceToUpdate.setPrivate(true); // Ensure it remains private

        raceToUpdate.setRaceName(raceUpdateDTO.getRaceName());
        raceToUpdate.setRaceInfo(raceUpdateDTO.getDescription());
        raceToUpdate.setHideLeaderboardUntilFinish(raceUpdateDTO.isHideLeaderboardUntilFinish());
        raceToUpdate.setUseSexCategories(raceUpdateDTO.isUseSexCategories());

        try {
            raceToUpdate.setStartDate(Instant.parse(raceUpdateDTO.getStartDate()));
            raceToUpdate.setEndDate(Instant.parse(raceUpdateDTO.getEndDate()));
            if (raceToUpdate.getEndDate().isBefore(raceToUpdate.getStartDate())) {
                return ResponseEntity.badRequest().body("End date must be after start date");
            }
        } catch (Exception e) {
            logger.error("Error parsing dates for race update {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body("Invalid date format. Please use ISO 8601 format (e.g., yyyy-MM-ddTHH:mm:ss.SSSZ)");
        }
        raceToUpdate.setSegmentIds(raceUpdateDTO.getSegmentIds());

        try {
            Race updatedRace = raceRepository.save(raceToUpdate);
            logger.info("Race with ID: {} updated successfully by user {}.", updatedRace.getId(), userStravaId);
            Hibernate.initialize(updatedRace.getOrganiser());
            Hibernate.initialize(updatedRace.getParticipants());
            updatedRace.getParticipants().forEach(p -> {
                Hibernate.initialize(p.getUser());
                Hibernate.initialize(p.getSegmentResults());
            });
            return ResponseEntity.ok(convertToRaceResponseDTO(updatedRace, true, oauth2User));
        } catch (Exception e) {
            logger.error("Error updating race {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update race due to server error");
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteRace(@PathVariable Long id, @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            logger.warn("Delete attempt for race {} without authentication.", id);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }
        long userStravaId;
        try {
            userStravaId = Long.parseLong(oauth2User.getName());
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format for user attempting to delete race {}: {}", id, oauth2User.getName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid user ID format.");
        }

        Optional<Race> raceOpt = raceRepository.findById(id);
        if (!raceOpt.isPresent()) {
            logger.warn("Delete attempt for non-existent race ID: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Race not found.");
        }
        Race raceToDelete = raceOpt.get();
        Hibernate.initialize(raceToDelete.getOrganiser()); // Ensure organizer is loaded

        if (raceToDelete.getOrganiser() == null || !raceToDelete.getOrganiser().getStravaId().equals(userStravaId)) {
            logger.warn("User {} attempted to delete race {} not owned by them. Actual owner: {}",
                    userStravaId, id, raceToDelete.getOrganiser() != null ? raceToDelete.getOrganiser().getStravaId() : "null");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete this race.");
        }

        try {
            // Rely on CascadeType.ALL and orphanRemoval=true on Race.participants
            // and subsequently on Participant.segmentResults
            raceRepository.delete(raceToDelete);
            // entityManager.flush(); // Optional: If you have EntityManager injected and want to force flush for earlier error detection.

            logger.info("Race with ID: {} deleted successfully by user {}.", id, userStravaId);
            return ResponseEntity.noContent().build(); // HTTP 204 No Content
        } catch (Exception e) {
            // Log the full exception stack trace for better debugging
            logger.error("Error deleting race {} by user {}: {}", id, userStravaId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete race due to a server error. Details: " + e.getMessage());
        }
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
                .map(race -> {
                    Hibernate.initialize(race.getOrganiser());
                    Hibernate.initialize(race.getParticipants());
                    race.getParticipants().forEach(p -> Hibernate.initialize(p.getUser()));
                    return convertToRaceResponseDTO(race, false, oauth2User);
                })
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
        Hibernate.initialize(race.getParticipants());


        boolean alreadyParticipant = race.getParticipants().stream()
                .anyMatch(p -> p.getUser().getStravaId().equals(userStravaId));
        if (alreadyParticipant) {
            logger.info("User {} already a participant in race {}.", userStravaId, raceId);
            return ResponseEntity.status(HttpStatus.CONFLICT).body("You are already a participant in this race.");
        }

        if (race.isPrivate()) { // Should always be true for new races
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
            Hibernate.initialize(savedParticipant.getUser());
            Hibernate.initialize(savedParticipant.getSegmentResults());
            logger.info("User {} successfully joined race {}.", userStravaId, raceId);
            return ResponseEntity.ok(convertToParticipantSummaryDTO(savedParticipant, race, oauth2User));
        } catch (Exception e) {
            logger.error("Error saving participant for race {}: {}", raceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Could not join race due to a server error.");
        }
    }

    @DeleteMapping("/{raceId}/participants/{participantId}")
    @Transactional
    public ResponseEntity<?> deleteParticipant(@PathVariable Long raceId,
                                               @PathVariable Long participantId,
                                               @AuthenticationPrincipal OAuth2User oauth2User) {
        if (oauth2User == null) {
            logger.warn("Attempt to delete participant {} from race {} without authentication.", participantId, raceId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated.");
        }

        long requesterStravaId;
        try {
            requesterStravaId = Long.parseLong(oauth2User.getName());
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format for user (principal name: {}) attempting action on participant {} in race {}.",
                    oauth2User.getName(), participantId, raceId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid user ID format.");
        }

        Optional<Race> raceOpt = raceRepository.findById(raceId);
        if (!raceOpt.isPresent()) {
            logger.warn("Attempt to access participant {} from non-existent race ID: {}", participantId, raceId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Race not found.");
        }
        Race race = raceOpt.get();
        Hibernate.initialize(race.getOrganiser());


        Optional<Participant> participantOpt = participantRepository.findById(participantId);
        if (!participantOpt.isPresent()) {
            logger.warn("Attempt to delete non-existent participant ID: {} from race {}", participantId, raceId);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Participant not found.");
        }
        Participant participantToDelete = participantOpt.get();
        Hibernate.initialize(participantToDelete.getUser());
        Hibernate.initialize(participantToDelete.getRace());
        Hibernate.initialize(participantToDelete.getSegmentResults());

        if (participantToDelete.getRace() == null || !participantToDelete.getRace().getId().equals(raceId)) {
            logger.warn("Participant {} (User Strava ID: {}) is not part of race {}. Actual race ID: {}",
                    participantId,
                    participantToDelete.getUser() != null ? participantToDelete.getUser().getStravaId() : "N/A",
                    raceId,
                    participantToDelete.getRace() != null ? participantToDelete.getRace().getId() : "null");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Participant does not belong to this race.");
        }

        boolean isRequesterOrganiser = race.getOrganiser() != null &&
                race.getOrganiser().getStravaId().equals(requesterStravaId);

        boolean isDeletingSelf = participantToDelete.getUser() != null &&
                participantToDelete.getUser().getStravaId().equals(requesterStravaId);

        if (!isRequesterOrganiser && !isDeletingSelf) {
            logger.warn("User (Strava ID: {}) is not authorized to delete participant {} (User Strava ID: {}) from race {}. " +
                            "Requester is not the race organiser and not the participant themselves.",
                    requesterStravaId,
                    participantId,
                    participantToDelete.getUser() != null ? participantToDelete.getUser().getStravaId() : "N/A",
                    raceId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("You are not authorized to delete this participant.");
        }

        try {
            logger.info("Attempting to delete participant: ID {} (User Strava ID: {}) from race ID: {}",
                    participantToDelete.getId(),
                    participantToDelete.getUser() != null ? participantToDelete.getUser().getStravaId() : "N/A",
                    raceId);

            if (Hibernate.isInitialized(race.getParticipants())) {
                race.getParticipants().remove(participantToDelete);
            }
            participantRepository.delete(participantToDelete);
            entityManager.flush();

            logger.info("Participant ID: {} successfully deleted from race ID: {} by requester (Strava ID: {}).",
                    participantId, raceId, requesterStravaId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            logger.error("Error during participant deletion operation for participant {} in race {}: {}",
                    participantId, raceId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to delete participant due to a server error.");
        }
    }

    @GetMapping("/{raceId}/strava-activities")
    @Transactional(readOnly = true)
    public ResponseEntity<List<StravaActivityDTO>> getStravaActivitiesForRace(
            @PathVariable Long raceId,
            @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Race race = raceRepository.findById(raceId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Race not found"));

        if (race.getStartDate() == null || race.getEndDate() == null) {
            logger.warn("Race {} is missing start or end date.", raceId);
            return ResponseEntity.badRequest().body(null);
        }

        List<StravaActivityDTO> activities = stravaService.getUserActivities(principal, race.getStartDate(), race.getEndDate());
        return ResponseEntity.ok(activities);
    }

    @PostMapping("/{raceId}/submit-activity")
    @Transactional
    public ResponseEntity<Void> submitStravaActivity(
            @PathVariable Long raceId,
            @RequestBody SubmitActivityRequestDTO request,
            @AuthenticationPrincipal OAuth2User principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        if (request.getActivityId() == null) {
            return ResponseEntity.badRequest().build();
        }

        long userStravaId;
        try {
            userStravaId = Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            logger.warn("Invalid Strava ID format for user submitting activity: {}", principal.getName());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(null);
        }

        participantRepository.findByRaceIdAndUserStravaId(raceId, userStravaId)
                .orElseThrow(() -> {
                    logger.warn("User {} not a participant in race {} tried to submit activity.", userStravaId, raceId);
                    return new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not a participant in this race.");
                });

        stravaService.processAndSaveActivityResults(principal, raceId, request.getActivityId());
        return ResponseEntity.ok().build();
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
                user.getUserStravaPic(),
                user.getUserSex()
        );
    }

    private ParticipantSummaryDTO convertToParticipantSummaryDTO(Participant participant, Race raceContext, OAuth2User currentUserPrincipal) {
        if (participant == null) {
            return null;
        }
        if (!Hibernate.isInitialized(participant.getUser())) {
            Hibernate.initialize(participant.getUser());
        }
        if (!Hibernate.isInitialized(participant.getSegmentResults())) {
            Hibernate.initialize(participant.getSegmentResults());
        }

        List<ParticipantSegmentResultDTO> segmentResultDTOs = new ArrayList<>();
        boolean raceFinished = raceContext.getEndDate() != null && Instant.now().isAfter(raceContext.getEndDate());
        boolean isOrganiser = false;
        long currentUserId = -1;

        if (currentUserPrincipal != null) {
            try {
                currentUserId = Long.parseLong(currentUserPrincipal.getName());
            } catch (NumberFormatException e) {
                logger.warn("Could not parse current user ID from principal in convertToParticipantSummaryDTO: {}", currentUserPrincipal.getName());
            }
            if (raceContext.getOrganiser() != null && !Hibernate.isInitialized(raceContext.getOrganiser())) {
                Hibernate.initialize(raceContext.getOrganiser());
            }
            isOrganiser = raceContext.getOrganiser() != null && raceContext.getOrganiser().getStravaId().equals(currentUserId);
        }

        boolean showTimesForThisParticipant = isOrganiser || raceFinished || !raceContext.isHideLeaderboardUntilFinish() ||
                (participant.getUser() != null && participant.getUser().getStravaId().equals(currentUserId));

        if (participant.getSegmentResults() != null) {
            segmentResultDTOs = participant.getSegmentResults().stream()
                    .map(psr -> new ParticipantSegmentResultDTO(
                            psr.getSegmentId(),
                            psr.getSegmentName(),
                            showTimesForThisParticipant ? psr.getElapsedTimeSeconds() : null))
                    .collect(Collectors.toList());
        }

        return new ParticipantSummaryDTO(
                participant.getId(),
                convertToUserSummaryDTO(participant.getUser()),
                participant.isSubmittedRide(),
                participant.getSubmittedActivityId(),
                segmentResultDTOs
        );
    }

    private RaceResponseDTO convertToRaceResponseDTO(Race race, boolean includeParticipantsDetails, OAuth2User currentUserPrincipal) {
        if (race == null) {
            return null;
        }
        if(!Hibernate.isInitialized(race.getOrganiser())) {
            Hibernate.initialize(race.getOrganiser());
        }

        List<ParticipantSummaryDTO> participantDTOs = Collections.emptyList();
        int participantCount = 0;

        if (Hibernate.isInitialized(race.getParticipants()) && race.getParticipants() != null) {
            participantCount = race.getParticipants().size();
            if (includeParticipantsDetails) {
                participantDTOs = race.getParticipants().stream()
                        .map(participant -> convertToParticipantSummaryDTO(participant, race, currentUserPrincipal))
                        .collect(Collectors.toList());
            }
        } else if (race.getId() != null) {
            // This is a fallback if participants are not initialized,
            // which shouldn't happen with proper EntityGraph usage or initialization.
            Integer countFromRepo = raceRepository.getParticipantCountForRace(race.getId());
            participantCount = (countFromRepo != null) ? countFromRepo : 0;
            logger.warn("Race participants collection was not initialized for race ID: {}. Participant count fetched separately.", race.getId());
            if (includeParticipantsDetails) {
                logger.warn("Participant details requested but collection not initialized for race ID: {}. Details will be missing.", race.getId());
            }
        }
        String racePassword = null;

        // Determine if the current user is the organizer and set the password
        if (currentUserPrincipal != null && race.getOrganiser() != null) {
            long currentUserId = -1;
            try {
                currentUserId = Long.parseLong(currentUserPrincipal.getName());
            } catch (NumberFormatException e) {
                logger.warn("Could not parse current user ID from principal in convertToRaceResponseDTO: {}", currentUserPrincipal.getName());
            }
            // Ensure organiser's Strava ID is not null before comparing
            if (race.getOrganiser().getStravaId() != null && race.getOrganiser().getStravaId().equals(currentUserId)) {
                racePassword = race.getPassword(); // Assign password if organizer
            }
        }

        return new RaceResponseDTO(
                race.getId(),
                race.getRaceName(),
                race.getRaceInfo(),
                race.getStartDate() != null ? race.getStartDate().toString() : null,
                race.getEndDate() != null ? race.getEndDate().toString() : null,
                race.getSegmentIds() != null ? new ArrayList<>(race.getSegmentIds()) : new ArrayList<>(),
                convertToUserSummaryDTO(race.getOrganiser()),
                race.isPrivate(),
                race.isHideLeaderboardUntilFinish(),
                race.isUseSexCategories(),
                includeParticipantsDetails ? participantDTOs : Collections.emptyList(), // Ensure it's empty list if not included
                participantCount,
                racePassword
        );

    }
}