// backend/src/main/java/com/matesRace/backend/security/CustomOAuth2UserService.java
package com.matesRace.backend.security;

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
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

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        Long stravaId = Long.valueOf(String.valueOf(attributes.get("id")));

        Optional<User> userOptional = userRepository.findByStravaId(stravaId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            logger.info("Updating existing user: {}", stravaId);
            // Update attributes that might change
            user.setUserStravaFirstName((String) attributes.get("firstname"));
            user.setUserStravaLastName((String) attributes.get("lastname"));
            user.setUserStravaPic((String) attributes.get("profile_medium")); // Or "profile" for larger
            user.setUserSex((String) attributes.get("sex")); // Typically 'M' or 'F'
            user.setUserCity((String) attributes.get("city"));
            user.setUserState((String) attributes.get("state"));
            user.setUserCountry((String) attributes.get("country"));
            // Note: Strava does not provide age directly.
            // If 'weight' is available and desired: user.setWeight((Double) attributes.get("weight")); requires 'activity:read_all' scope.

        } else {
            logger.info("Creating new user: {}", stravaId);
            user = new User();
            user.setStravaId(stravaId);
            user.setUserStravaFirstName((String) attributes.get("firstname"));
            user.setUserStravaLastName((String) attributes.get("lastname"));
            user.setUserStravaPic((String) attributes.get("profile_medium"));
            user.setUserSex((String) attributes.get("sex"));
            user.setUserCity((String) attributes.get("city"));
            user.setUserState((String) attributes.get("state"));
            user.setUserCountry((String) attributes.get("country"));
            user.setDisplayName(user.getUserStravaFirstName() + " " + user.getUserStravaLastName());
        }

        OAuth2AccessToken accessToken = userRequest.getAccessToken();
        Instant tokenExpiryInstant = accessToken.getExpiresAt();

        if (tokenExpiryInstant != null) {
            user.setUserTokenExpire(LocalDateTime.ofInstant(tokenExpiryInstant, ZoneOffset.UTC));
            logger.debug("Token expiry set in CustomOAuth2UserService for user {}: {}", stravaId, user.getUserTokenExpire());
        } else {
            user.setUserTokenExpire(null);
            logger.warn("Access Token expiry is null when processing user {} in CustomOAuth2UserService", stravaId);
        }

        // The OAuth2LoginSuccessListener is primarily responsible for token persistence.
        // However, setting the access token here can be useful if other parts of the login process need it immediately.
        user.setUserStravaAccess(accessToken.getTokenValue());

        userRepository.save(user);
        return oauth2User;
    }
}