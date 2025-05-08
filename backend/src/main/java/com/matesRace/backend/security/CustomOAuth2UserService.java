package com.matesRace.backend.security;

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oauth2User.getAttributes();

        // Extract attributes - **IMPORTANT: Adjust attribute names based on actual Strava response**
        // Common attributes might be 'id', 'username', 'firstname', 'lastname', 'profile'
        Long stravaId = Long.valueOf(attributes.get("id").toString()); // Strava ID is usually 'id'
        String username = (String) attributes.get("username"); // Or another name field
        String firstName = (String) attributes.get("firstname");
        String lastName = (String) attributes.get("lastname");
        String profilePic = (String) attributes.get("profile");
        String email = (String) attributes.get("email"); // If requested in scope & provided

        org.springframework.security.oauth2.core.OAuth2AccessToken accessToken = userRequest.getAccessToken();
        String accessTokenValue = accessToken.getTokenValue();
        Instant tokenExpiresAt = accessToken.getExpiresAt();

        // The OAuth2AccessToken object does not contain the refresh token.
        // The refresh token is managed by the OAuth2AuthorizedClientService.
        // Therefore, we cannot directly get refreshTokenObject or refreshTokenValue here.
        // String refreshTokenValue will be null if we cannot obtain it through other means
        // within this specific method's context. For now, we'll assume it's not available here.
        String refreshTokenValue = null;

        Optional<User> userOptional = userRepository.findByStravaId(stravaId);
        User user;
        if (userOptional.isPresent()) {
            // User exists, update details
            user = userOptional.get();
            user.setDisplayName(username); // Update display name
            user.setUserStravaFirstName(firstName);
            user.setUserStravaLastName(lastName);
            user.setUserStravaPic(profilePic);
            user.setUserStravaAccess(accessTokenValue); // Update access token
            if (refreshTokenValue != null) { // This will currently not be true
                user.setUserStravaRefresh(refreshTokenValue);
            } else {
                // Explicitly set to null or handle as per your application logic
                // if you expect it to be cleared if not received.
                // Or, preserve existing value if that's the desired behavior:
                // if (user.getUserStravaRefresh() == null && refreshTokenValue != null) user.setUserStravaRefresh(refreshTokenValue);
            }
            user.setUserTokenExpire(tokenExpiresAt); // Update expiry
            System.out.println("Updating existing user: " + stravaId);
        } else {
            // New user, create and populate
            user = new User();
            user.setStravaId(stravaId);
            user.setDisplayName(username);
            user.setUserStravaFirstName(firstName);
            user.setUserStravaLastName(lastName);
            user.setUserStravaPic(profilePic);
            user.setUserStravaAccess(accessTokenValue);
            // refreshTokenValue will be null here based on the current change
            user.setUserStravaRefresh(refreshTokenValue);
            user.setUserTokenExpire(tokenExpiresAt);
            user.setEmail(email); // Set email if available
            // Set other fields like sex if available and needed
            System.out.println("Creating new user: " + stravaId);
        }

        userRepository.save(user); // Save new or updated user to DB

        // Return the original OAuth2User which Spring Security uses to build the Authentication object
        return oauth2User;
    }
}