package com.matesRace.backend.security;

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AccessToken; // Needed if you access token here
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger logger = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    @Autowired
    private UserRepository userRepository;

    // You might need OAuth2AuthorizedClientService if you fetch the full client here
    // @Autowired
    // private OAuth2AuthorizedClientService authorizedClientService;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        Long stravaId = Long.valueOf(String.valueOf(attributes.get("id"))); // Ensure this matches Strava's ID attribute

        Optional<User> userOptional = userRepository.findByStravaId(stravaId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            logger.info("Updating existing user: {}", stravaId);
            // Update attributes that might change
            user.setUserStravaFirstName((String) attributes.get("firstname"));
            user.setUserStravaLastName((String) attributes.get("lastname"));
            // Strava provides 'profile_medium' (124x124) and 'profile' (62x62)
            user.setUserStravaPic((String) attributes.get("profile_medium"));
            if (attributes.containsKey("sex")) { // Only if "profile:read_all" scope is present
                user.setUserSex((String) attributes.get("sex"));
            }
        } else {
            logger.info("Creating new user: {}", stravaId);
            user = new User();
            user.setStravaId(stravaId);
            user.setUserStravaFirstName((String) attributes.get("firstname"));
            user.setUserStravaLastName((String) attributes.get("lastname"));
            user.setUserStravaPic((String) attributes.get("profile_medium"));
            if (attributes.containsKey("sex")) { // Only if "profile:read_all" scope is present
                user.setUserSex((String) attributes.get("sex"));
            }
            // Potentially set display name
            user.setDisplayName(user.getUserStravaFirstName() + " " + user.getUserStravaLastName());
        }

        // If you are setting token expiry here (AROUND YOUR LINE 66)
        // This is where the error likely occurs:
        OAuth2AccessToken accessToken = userRequest.getAccessToken(); // Get access token from the request
        Instant tokenExpiryInstant = accessToken.getExpiresAt();

        if (tokenExpiryInstant != null) {
            // THIS IS THE FIX for the incompatible types error
            user.setUserTokenExpire(LocalDateTime.ofInstant(tokenExpiryInstant, ZoneOffset.UTC));
            logger.debug("Token expiry set in CustomOAuth2UserService for user {}: {}", stravaId, user.getUserTokenExpire());
        } else {
            user.setUserTokenExpire(null); // Or handle as an error/warning
            logger.warn("Access Token expiry is null when processing user {} in CustomOAuth2UserService", stravaId);
        }

        // Note: The OAuth2LoginSuccessListener is now primarily responsible for all token persistence (access, refresh, expiry).
        // Setting user.setUserStravaAccess() and user.setUserStravaRefresh() here might be redundant
        // if the listener handles it. Consider centralizing token logic.
        // For example, you might still set the access token here if needed for immediate use,
        // but the listener should be the source of truth for DB persistence of all tokens.
        // user.setUserStravaAccess(accessToken.getTokenValue());


        userRepository.save(user);
        return oauth2User; // Spring Security will wrap this in an Authentication object later
    }
}