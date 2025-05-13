// backend/src/main/java/com/matesRace/backend/service/StravaService.java
package com.matesRace.backend.service;

import com.matesRace.backend.dto.StravaActivityDTO;
import com.matesRace.backend.exception.RaceNotFoundException;
import com.matesRace.backend.exception.UserNotFoundException;
import com.matesRace.backend.model.*;
import com.matesRace.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
// OAuth2AccessToken is not directly used but often imported with OAuth2User
// import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;
// Mono is not directly used if .block() is always used, but good to have if considering reactive flow
// import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects; // Import for Objects.nonNull
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class StravaService {

    private static final Logger logger = LoggerFactory.getLogger(StravaService.class);

    private final WebClient webClient;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final UserRepository userRepository;
    private final RaceRepository raceRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantSegmentResultRepository segmentResultRepository;

    @Value("${spring.security.oauth2.client.provider.strava.token-uri}")
    private String tokenUri;

    @Value("${spring.security.oauth2.client.registration.strava.client-id}")
    private String clientId;

    private final String STRAVA_API_BASE_URL = "https://www.strava.com/api/v3";

    @Autowired
    public StravaService(WebClient.Builder webClientBuilder,
                         OAuth2AuthorizedClientService authorizedClientService,
                         UserRepository userRepository,
                         RaceRepository raceRepository,
                         ParticipantRepository participantRepository,
                         ParticipantSegmentResultRepository segmentResultRepository) {
        this.webClient = webClientBuilder.baseUrl(STRAVA_API_BASE_URL).build();
        this.authorizedClientService = authorizedClientService;
        this.userRepository = userRepository;
        this.raceRepository = raceRepository;
        this.participantRepository = participantRepository;
        this.segmentResultRepository = segmentResultRepository;
    }

    private String getAccessToken(OAuth2User principal) {
        if (principal == null || principal.getName() == null) {
            logger.warn("Attempt to get access token with invalid principal.");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User principal is invalid.");
        }
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient("strava", principal.getName());
        if (client == null || client.getAccessToken() == null) {
            logger.warn("Strava access token not available for user {}. Client or token is null.", principal.getName());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Strava access token not available. Please re-authenticate.");
        }
        return client.getAccessToken().getTokenValue();
    }

    public List<StravaActivityDTO> getUserActivities(OAuth2User principal, Instant raceStartDate, Instant raceEndDate) {
        String accessToken = getAccessToken(principal); // Can throw ResponseStatusException
        long afterTimestamp = raceStartDate.getEpochSecond();
        long beforeTimestamp = raceEndDate.getEpochSecond();

        logger.debug("Fetching Strava activities for user {} between {} and {}", principal.getName(), raceStartDate, raceEndDate);

        try {
            List<Map<String, Object>> stravaActivitiesResponse = webClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/athlete/activities")
                            .queryParam("before", beforeTimestamp)
                            .queryParam("after", afterTimestamp)
                            .queryParam("per_page", 50) // Fetch up to 50
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block(); // Using block for simplicity

            if (stravaActivitiesResponse == null) {
                logger.info("Strava API returned null for activities for user {}.", principal.getName());
                return Collections.emptyList();
            }

            logger.debug("Received {} activities from Strava for user {}.", stravaActivitiesResponse.size(), principal.getName());

            return stravaActivitiesResponse.stream()
                    .filter(activityMap -> {
                        if (activityMap == null) {
                            logger.warn("Encountered a null activityMap in Strava response for user {}", principal.getName());
                            return false;
                        }
                        Object typeObj = activityMap.get("type");
                        if (!(typeObj instanceof String)) {
                            logger.warn("Activity map for user {} has missing or non-string 'type' field: {}", principal.getName(), activityMap);
                            return false; // Skip if type is not a String or missing
                        }
                        boolean isRide = "Ride".equalsIgnoreCase((String) typeObj);
                        if (!isRide) {
                            logger.trace("Skipping non-Ride activity for user {}: type '{}', name '{}'", principal.getName(), typeObj, activityMap.get("name"));
                        }
                        return isRide;
                    })
                    .map(activityMap -> {
                        try {
                            // Check for presence of critical fields before attempting to access/cast
                            if (activityMap.get("id") == null ||
                                    !(activityMap.get("id") instanceof Number) ||
                                    activityMap.get("name") == null ||
                                    !(activityMap.get("name") instanceof String) ||
                                    activityMap.get("start_date_local") == null ||
                                    !(activityMap.get("start_date_local") instanceof String) ||
                                    activityMap.get("type") == null ||
                                    !(activityMap.get("type") instanceof String)) {

                                logger.warn("Skipping activity due to missing or invalid type for critical fields for user {}. Activity Data: {}", principal.getName(), activityMap);
                                return null;
                            }

                            // More defensive access for optional numeric fields
                            double distance = 0.0;
                            Object distanceObj = activityMap.get("distance");
                            if (distanceObj instanceof Number) {
                                distance = ((Number) distanceObj).doubleValue();
                            } else if (distanceObj != null) {
                                logger.warn("Activity for user {} has non-numeric distance field: {}. Using 0.0. Data: {}", principal.getName(), distanceObj, activityMap);
                            }

                            int elapsedTime = 0;
                            Object elapsedTimeObj = activityMap.get("elapsed_time");
                            if (elapsedTimeObj instanceof Number) {
                                elapsedTime = ((Number) elapsedTimeObj).intValue();
                            } else if (elapsedTimeObj != null) {
                                logger.warn("Activity for user {} has non-numeric elapsed_time field: {}. Using 0. Data: {}", principal.getName(), elapsedTimeObj, activityMap);
                            }

                            return new StravaActivityDTO(
                                    ((Number) activityMap.get("id")).longValue(),
                                    (String) activityMap.get("name"),
                                    (String) activityMap.get("start_date_local"),
                                    distance,
                                    elapsedTime,
                                    (String) activityMap.get("type")
                            );
                        } catch (ClassCastException | NullPointerException e) { // Catch more specific exceptions
                            logger.error("Error mapping individual Strava activity to DTO for user {}. Activity Data: {} Error: {}",
                                    principal.getName(), activityMap, e.getMessage(), e); // Log full exception for mapping error
                            return null; // Skip this problematic activity, allow others to process
                        }
                    })
                    .filter(Objects::nonNull) // Remove any nulls that resulted from mapping errors
                    .collect(Collectors.toList());

        } catch (ResponseStatusException rse) { // Re-throw known ResponseStatusExceptions
            throw rse;
        } catch (Exception e) { // Catch other unexpected exceptions during API call or processing
            logger.error("Error during Strava API call or processing for user {}: {}", principal.getName(), e.getMessage(), e); // Log full stack trace here
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch or process activities from Strava.", e); // Include cause
        }
    }

    @Transactional
    public void processAndSaveActivityResults(OAuth2User principal, Long raceId, Long stravaActivityId) {
        String accessToken = getAccessToken(principal);
        long userStravaId = Long.parseLong(principal.getName());

        User user = userRepository.findByStravaId(userStravaId)
                .orElseThrow(() -> new UserNotFoundException("User not found with Strava ID: " + userStravaId));

        Race race = raceRepository.findById(raceId)
                .orElseThrow(() -> new RaceNotFoundException("Race not found with ID: " + raceId));

        Participant participant = participantRepository.findByRaceIdAndUserStravaId(raceId, userStravaId)
                .orElseGet(() -> {
                    logger.warn("Participant record not found for user {} in race {}. Creating one.", userStravaId, raceId);
                    Participant newP = new Participant();
                    newP.setRace(race);
                    newP.setUser(user);
                    newP.setSubmittedRide(false);
                    return participantRepository.save(newP);
                });

        Map<String, Object> activityDetails;
        try {
            logger.debug("Fetching detailed Strava activity {} for user {}", stravaActivityId, principal.getName());
            activityDetails = webClient.get()
                    .uri("/activities/{id}", stravaActivityId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            logger.error("Error fetching Strava activity details for activity {}: {}", stravaActivityId, e.getMessage(), e); // Log full stack trace
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to fetch activity details from Strava.", e);
        }

        if (activityDetails == null) { // Added null check for activityDetails itself
            logger.error("Fetched Strava activity details are null for activity ID: {}", stravaActivityId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fetched activity details from Strava are null.");
        }

        if (!activityDetails.containsKey("segment_efforts") || !(activityDetails.get("segment_efforts") instanceof List)) {
            logger.warn("No segment_efforts list found in Strava activity {} for user {}. Activity Data: {}",
                    stravaActivityId, principal.getName(), activityDetails);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected activity does not contain valid segment efforts.");
        }

        @SuppressWarnings("unchecked") // Suppress warning as we've checked instanceof List
        List<Map<String, Object>> segmentEfforts = (List<Map<String, Object>>) activityDetails.get("segment_efforts");
        List<Long> raceSegmentIds = race.getSegmentIds();

        logger.debug("Processing {} segment efforts for activity {}, for race {} with {} defined segments.",
                segmentEfforts.size(), stravaActivityId, raceId, raceSegmentIds.size());

        // Clear existing segment results for this participant to handle updates
        if (participant.getId() != null) { // Ensure participant has an ID (i.e., is persisted)
            List<ParticipantSegmentResult> existingResults = segmentResultRepository.findByParticipantId(participant.getId());
            if (!existingResults.isEmpty()) {
                logger.debug("Deleting {} existing segment results for participant {}", existingResults.size(), participant.getId());
                segmentResultRepository.deleteAll(existingResults); // More explicit deletion
            }
        }
        participant.getSegmentResults().clear(); // Also clear the collection in the entity


        for (Map<String, Object> effort : segmentEfforts) {
            if (effort == null) {
                logger.warn("Encountered null segment effort in activity {}", stravaActivityId);
                continue;
            }
            Object segmentMapObj = effort.get("segment");
            if (!(segmentMapObj instanceof Map)) {
                logger.warn("Segment effort in activity {} is missing 'segment' map or it's not a map. Effort data: {}", stravaActivityId, effort);
                continue;
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> segmentMap = (Map<String, Object>) segmentMapObj;

            Object segmentIdObj = segmentMap.get("id");
            Object elapsedTimeObj = effort.get("elapsed_time");
            Object segmentNameObj = segmentMap.get("name");

            if (!(segmentIdObj instanceof Number) || !(elapsedTimeObj instanceof Number)) {
                logger.warn("Segment effort in activity {} has invalid ID or elapsed_time type. Segment Data: {}, Effort Data: {}",
                        stravaActivityId, segmentMap, effort);
                continue;
            }

            long segmentEffortId = ((Number) segmentIdObj).longValue();

            if (raceSegmentIds.contains(segmentEffortId)) {
                ParticipantSegmentResult psr = new ParticipantSegmentResult();
                psr.setParticipant(participant);
                psr.setSegmentId(segmentEffortId);
                psr.setSegmentName(segmentNameObj instanceof String ? (String) segmentNameObj : "Unnamed Segment");
                psr.setElapsedTimeSeconds(((Number) elapsedTimeObj).intValue());

                participant.getSegmentResults().add(psr);
                logger.debug("Matched race segment ID {} (Name: {}) with time {}s for participant {}",
                        segmentEffortId, psr.getSegmentName(), psr.getElapsedTimeSeconds(), participant.getUser().getStravaId());
            }
        }

        if (participant.getSegmentResults().isEmpty() && !raceSegmentIds.isEmpty()) {
            logger.warn("User {} submitted activity {} for race {} but no matching race segments were found in the activity's efforts.",
                    userStravaId, stravaActivityId, raceId);
        }

        participant.setSubmittedRide(true);
        participant.setSubmittedActivityId(stravaActivityId);
        participantRepository.save(participant); // This will cascade save new ParticipantSegmentResult due to @OneToMany(cascade=ALL)

        logger.info("Successfully processed and saved activity {} for user {} in race {}", stravaActivityId, userStravaId, raceId);
    }
}