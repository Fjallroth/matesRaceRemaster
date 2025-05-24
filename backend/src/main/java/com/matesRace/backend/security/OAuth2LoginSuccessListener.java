package com.matesRace.backend.security;

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SavedRequestAwareAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

@Component
public class OAuth2LoginSuccessListener extends SavedRequestAwareAuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2LoginSuccessListener.class);

    private final UserRepository userRepository;
    private final OAuth2AuthorizedClientService authorizedClientService;

    @Autowired
    public OAuth2LoginSuccessListener(UserRepository userRepository,
                                      OAuth2AuthorizedClientService authorizedClientService, @Value("${frontend.url}") String frontendUrl) {
        this.userRepository = userRepository;
        this.authorizedClientService = authorizedClientService;
        setDefaultTargetUrl(frontendUrl + "/myraces");
        setAlwaysUseDefaultTargetUrl(true);
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        logger.info("<<<< OAuth2LoginSuccessListener: onAuthenticationSuccess ENTERED >>>>");
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User principal = oauthToken.getPrincipal();
        String clientRegistrationId = oauthToken.getAuthorizedClientRegistrationId();

        if (!"strava".equalsIgnoreCase(clientRegistrationId)) {
            logger.warn("Unsupported client registration ID: {}", clientRegistrationId);
            super.onAuthenticationSuccess(request, response, authentication);
            return;
        }

        Long stravaId = Long.valueOf(principal.getName()); // Strava ID from principal.getName()

        OAuth2AuthorizedClient authorizedClient = authorizedClientService.loadAuthorizedClient(
                clientRegistrationId,
                principal.getName() // Principal's name, typically the user's unique ID from the provider
        );

        if (authorizedClient == null) {
            logger.error("Could not load OAuth2AuthorizedClient for clientRegistrationId: {} and principalName: {}",
                    clientRegistrationId, principal.getName());
            // Potentially redirect to an error page or handle appropriately
            response.sendRedirect("/login?error=auth_client_missing");
            return;
        }

        OAuth2AccessToken accessToken = authorizedClient.getAccessToken();
        OAuth2RefreshToken refreshToken = authorizedClient.getRefreshToken();

        Optional<User> userOptional = userRepository.findByStravaId(stravaId);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            logger.info("User found with Strava ID: {}", stravaId);
        } else {

            logger.error("User not found with Strava ID: {}. User should be created by CustomOAuth2UserService.", stravaId);

            response.sendRedirect("/login?error=user_not_found");
            return;
        }


        user.setUserStravaAccess(accessToken.getTokenValue());
        logger.debug("Strava Access Token for user {}: {}", stravaId, accessToken.getTokenValue() != null ? "obtained" : "null");


        if (accessToken.getExpiresAt() != null) {
            user.setUserTokenExpire(LocalDateTime.ofInstant(accessToken.getExpiresAt(), ZoneOffset.UTC));
            logger.debug("Strava Access Token Expires At for user {}: {}", stravaId, user.getUserTokenExpire());
        } else {

            logger.warn("Access Token expiry is null for user {}", stravaId);
        }

        if (refreshToken != null) {
            user.setUserStravaRefresh(refreshToken.getTokenValue());
            logger.debug("Strava Refresh Token for user {}: {}", stravaId, refreshToken.getTokenValue() != null ? "obtained" : "null");
        } else {

            logger.warn("Strava Refresh Token is NULL for user {}. Check OAuth2 flow and approval_prompt.", stravaId);

            if (user.getUserStravaRefresh() == null) {
                logger.error("CRITICAL: New refresh token is null and no existing refresh token for user {}", stravaId);
            }
        }



        userRepository.save(user);
        logger.info("Successfully updated tokens for user with Strava ID: {}", stravaId);

        super.onAuthenticationSuccess(request, response, authentication); // Handles redirect
    }
}