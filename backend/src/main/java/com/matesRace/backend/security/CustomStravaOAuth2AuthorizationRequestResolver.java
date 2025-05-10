package com.matesRace.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames; // Keep for SCOPE if needed, or remove if using literal.

import java.util.HashMap;
import java.util.Map;
// No need for UriComponentsBuilder if we let Spring handle parameter appending from additionalParameters

public class CustomStravaOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private static final Logger logger = LoggerFactory.getLogger(CustomStravaOAuth2AuthorizationRequestResolver.class);
    private final OAuth2AuthorizationRequestResolver defaultResolver;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final String stravaRegistrationId = "strava";

    public CustomStravaOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository, String authorizationRequestBaseUri) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, authorizationRequestBaseUri);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        logger.debug("CustomStravaOAuth2AuthorizationRequestResolver: resolve(request) called.");
        OAuth2AuthorizationRequest authorizationRequest = this.defaultResolver.resolve(request);
        if (authorizationRequest != null && stravaRegistrationId.equals(authorizationRequest.getAttribute("registration_id"))) {
            return customizeAuthorizationRequest(authorizationRequest);
        }
        return authorizationRequest;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        logger.debug("CustomStravaOAuth2AuthorizationRequestResolver: resolve(request, clientRegistrationId={}) called.", clientRegistrationId);
        OAuth2AuthorizationRequest authorizationRequest = this.defaultResolver.resolve(request, clientRegistrationId);

        if (stravaRegistrationId.equals(clientRegistrationId)) {
            return customizeAuthorizationRequest(authorizationRequest);
        }
        return authorizationRequest;
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null) {
            logger.warn("CustomStravaResolver: authorizationRequest is null, cannot customize.");
            return null;
        }

        logger.info("CustomStravaResolver: Customizing request for registration_id: {}, client_id: {}",
                authorizationRequest.getAttribute("registration_id"), authorizationRequest.getClientId());

        ClientRegistration stravaClientRegistration = this.clientRegistrationRepository.findByRegistrationId(stravaRegistrationId);
        if (stravaClientRegistration == null) {
            logger.error("CustomStravaResolver: Strava client registration not found. Cannot customize scopes properly.");
            // Fallback to original request or handle error, but approval_prompt might be missed.
            // For safety, let's still try to add approval_prompt if we know it's Strava
            Map<String, Object> emergencyParams = new HashMap<>(authorizationRequest.getAdditionalParameters());
            emergencyParams.put("approval_prompt", "force"); // Use literal string
            return OAuth2AuthorizationRequest.from(authorizationRequest)
                    .additionalParameters(emergencyParams)
                    .build();
        }

        // Ensure scopes are comma-separated for Strava
        String commaSeparatedScopes = String.join(",", stravaClientRegistration.getScopes());
        logger.info("CustomStravaResolver: Original scopes from ClientRegistration: {}", stravaClientRegistration.getScopes());
        logger.info("CustomStravaResolver: Intended comma-separated scopes for parameter: {}", commaSeparatedScopes);

        Map<String, Object> additionalParameters = new HashMap<>(authorizationRequest.getAdditionalParameters());
        additionalParameters.put(OAuth2ParameterNames.SCOPE, commaSeparatedScopes); // For Strava, scope should be comma-separated
        additionalParameters.put("approval_prompt", "force"); // Use literal string "approval_prompt"

        logger.info("CustomStravaResolver: Final additional parameters to be used: {}", additionalParameters);

        // Let Spring build the URI with these additional parameters rather than manually manipulating the URI string.
        // The `authorizationRequestUri` in the built request will be constructed by Spring using these.
        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(additionalParameters)
                // .scopes(null) // Clear original scopes if additionalParameters fully defines it.
                // Or rely on DefaultOAuth2AuthorizationRequestResolver to handle merging.
                // For Strava, explicitly setting the scope in additionalParameters is key.
                .build();
    }
}