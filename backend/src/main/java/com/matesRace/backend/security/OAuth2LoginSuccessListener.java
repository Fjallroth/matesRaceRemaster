package com.matesRace.backend.security; // Or a suitable package

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional; // Import Transactional

import java.util.Map; // Import Map
import java.util.Optional; // Import Optional


@Component
public class OAuth2LoginSuccessListener implements ApplicationListener<AuthenticationSuccessEvent> {

    private final OAuth2AuthorizedClientService authorizedClientService;
    private final UserRepository userRepository;

    @Autowired
    public OAuth2LoginSuccessListener(OAuth2AuthorizedClientService authorizedClientService,
                                      UserRepository userRepository) {
        this.authorizedClientService = authorizedClientService;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional // Ensure operations are within a transaction
    public void onApplicationEvent(AuthenticationSuccessEvent event) {
        if (event.getAuthentication() instanceof OAuth2AuthenticationToken) {
            OAuth2AuthenticationToken authenticationToken = (OAuth2AuthenticationToken) event.getAuthentication();
            OAuth2User principal = authenticationToken.getPrincipal();
            Map<String, Object> attributes = principal.getAttributes();

            // IMPORTANT: Ensure "id" is the correct attribute name for Strava User ID
            Object stravaIdAttribute = attributes.get("id");
            if (stravaIdAttribute == null) {
                System.err.println("Strava ID attribute not found in principal attributes.");
                return;
            }
            Long stravaId = Long.valueOf(stravaIdAttribute.toString());


            String clientRegistrationId = authenticationToken.getAuthorizedClientRegistrationId();

            // Load the authorized client
            OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
                    clientRegistrationId,
                    authenticationToken.getName() // Principal's name
            );

            if (authorizedClient != null) {
                OAuth2RefreshToken refreshToken = authorizedClient.getRefreshToken();
                if (refreshToken != null) {
                    String refreshTokenValue = refreshToken.getTokenValue();
                    // Now update your User entity
                    Optional<User> userOptional = userRepository.findByStravaId(stravaId);
                    if (userOptional.isPresent()) {
                        User user = userOptional.get();
                        user.setUserStravaRefresh(refreshTokenValue);
                        // You might also want to update the access token and expiry here
                        // if they could have been renewed, though CustomOAuth2UserService already handles initial set.
                        // user.setUserStravaAccess(authorizedClient.getAccessToken().getTokenValue());
                        // user.setUserTokenExpire(authorizedClient.getAccessToken().getExpiresAt());
                        userRepository.save(user);
                        System.out.println("Updated refresh token for user: " + stravaId);
                    } else {
                        System.err.println("User not found in DB during refresh token update: " + stravaId);
                        // This case should ideally not happen if CustomOAuth2UserService ran first.
                    }
                }
            }
        }
    }
}