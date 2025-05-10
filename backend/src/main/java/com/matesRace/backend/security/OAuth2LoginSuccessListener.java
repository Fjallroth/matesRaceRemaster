package com.matesRace.backend.security;

import com.matesRace.backend.model.User;
import com.matesRace.backend.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
                                      OAuth2AuthorizedClientService authorizedClientService) {
        this.userRepository = userRepository;
        this.authorizedClientService = authorizedClientService;
        setDefaultTargetUrl("http://localhost:5173/myraces"); // Your frontend redirect URL
        setAlwaysUseDefaultTargetUrl(true);
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        logger.error("<<<< OAuth2LoginSuccessListener: onAuthenticationSuccess ENTERED >>>>");
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
            // This case should ideally be handled by CustomOAuth2UserService to create the user first.
            // If CustomOAuth2UserService doesn't create the user, this listener might need to.
            // However, for token updates, the user must exist.
            logger.error("User not found with Strava ID: {}. User should be created by CustomOAuth2UserService.", stravaId);
            // Redirect to an error page or handle appropriately
            response.sendRedirect("/login?error=user_not_found");
            return;
        }

        // Update token information
        user.setUserStravaAccess(accessToken.getTokenValue());
        logger.debug("Strava Access Token for user {}: {}", stravaId, accessToken.getTokenValue() != null ? "obtained" : "null");


        if (accessToken.getExpiresAt() != null) {
            user.setUserTokenExpire(LocalDateTime.ofInstant(accessToken.getExpiresAt(), ZoneOffset.UTC));
            logger.debug("Strava Access Token Expires At for user {}: {}", stravaId, user.getUserTokenExpire());
        } else {
            // Strava's 'expires_in' might be used by Spring Security to calculate 'expiresAt'.
            // If 'expiresAt' is null, it's an issue, or a very long-lived token (unlikely for access tokens).
            logger.warn("Access Token expiry is null for user {}", stravaId);
        }

        if (refreshToken != null) {
            user.setUserStravaRefresh(refreshToken.getTokenValue());
            logger.debug("Strava Refresh Token for user {}: {}", stravaId, refreshToken.getTokenValue() != null ? "obtained" : "null");
        } else {
            // This is problematic. Refresh token might not be sent if approval_prompt=force wasn't used
            // or if the user has previously authorized and Strava doesn't resend it.
            // Your CustomStravaOAuth2AuthorizationRequestResolver should handle `approval_prompt=force`.
            logger.warn("Strava Refresh Token is NULL for user {}. Check OAuth2 flow and approval_prompt.", stravaId);
            // Keep the existing refresh token if a new one isn't provided,
            // but log a warning. If it's the first login and it's null, that's a bigger issue.
            if (user.getUserStravaRefresh() == null) {
                logger.error("CRITICAL: New refresh token is null and no existing refresh token for user {}", stravaId);
            }
        }

        // The CustomOAuth2UserService should have already populated first name, last name, pic, sex.
        // If not, or if you want to ensure it's always fresh:
        // String firstName = principal.getAttribute("firstname");
        // String lastName = principal.getAttribute("lastname");
        // String pictureUrl = principal.getAttribute("profile_medium"); // or "profile" for larger
        // String sex = principal.getAttribute("sex"); // if profile:read_all scope is granted
        // user.setUserStravaFirstName(firstName);
        // user.setUserStravaLastName(lastName);
        // user.setUserStravaPic(pictureUrl);
        // user.setUserSex(sex); // Set sex if you need it
        // user.setDisplayName(firstName + " " + lastName);


        userRepository.save(user);
        logger.info("Successfully updated tokens for user with Strava ID: {}", stravaId);

        super.onAuthenticationSuccess(request, response, authentication); // Handles redirect
    }
}