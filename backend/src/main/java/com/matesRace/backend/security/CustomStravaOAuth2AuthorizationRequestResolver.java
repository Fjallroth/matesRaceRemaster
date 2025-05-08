package com.matesRace.backend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;
// import java.util.Set; // Not strictly needed if we rely on ClientRegistration's scopes
// import java.util.stream.Collectors; // Not strictly needed

public class CustomStravaOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final OAuth2AuthorizationRequestResolver defaultResolver;
    private final ClientRegistrationRepository clientRegistrationRepository;
    private final String stravaRegistrationId = "strava"; // As defined in your application.properties

    public CustomStravaOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository, String authorizationRequestBaseUri) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(clientRegistrationRepository, authorizationRequestBaseUri);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        System.out.println("CustomStravaOAuth2AuthorizationRequestResolver: resolve(request) called.");
        OAuth2AuthorizationRequest authorizationRequest = this.defaultResolver.resolve(request);
        // Check if the default resolver found a registrationId (it might for /oauth2/authorization/{registrationId} pattern)
        if (authorizationRequest != null && stravaRegistrationId.equals(authorizationRequest.getAttribute("registration_id"))) {
            return customizeAuthorizationRequest(authorizationRequest);
        } else if (authorizationRequest != null && request.getRequestURI().contains("/" + stravaRegistrationId)) {
            // Fallback check if the request URI explicitly mentions strava
            return customizeAuthorizationRequest(authorizationRequest);
        }
        // If not identified as Strava here, it might be identified in the other resolve method.
        return authorizationRequest;
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        System.out.println("CustomStravaOAuth2AuthorizationRequestResolver: resolve(request, clientRegistrationId=" + clientRegistrationId + ") called.");
        OAuth2AuthorizationRequest authorizationRequest = this.defaultResolver.resolve(request, clientRegistrationId);

        if (stravaRegistrationId.equals(clientRegistrationId)) {
            return customizeAuthorizationRequest(authorizationRequest);
        }
        return authorizationRequest;
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null) {
            System.out.println("CustomStravaResolver: authorizationRequest is null, cannot customize.");
            return null;
        }

        System.out.println("CustomStravaResolver: Attempting to customize request for registration_id: " + authorizationRequest.getAttribute("registration_id") + ", client_id: " + authorizationRequest.getClientId());


        // Fetch the ClientRegistration for Strava
        ClientRegistration stravaClientRegistration = this.clientRegistrationRepository.findByRegistrationId(stravaRegistrationId);
        if (stravaClientRegistration == null) {
            System.err.println("CustomStravaResolver: Strava client registration not found in repository. Cannot customize scopes.");
            return authorizationRequest;
        }

        // Spring Security's default behavior for scopes defined as a comma-separated string
        // in application.properties (e.g., "scope1,scope2") is often to treat them as
        // a Set containing {"scope1", "scope2"}. The DefaultOAuth2AuthorizationRequestResolver
        // then joins these with a space. We need to override this.

        // We want the scopes to be joined by a comma.
        String commaSeparatedScopes = String.join(",", stravaClientRegistration.getScopes());
        System.out.println("CustomStravaResolver: Original scopes from ClientRegistration: " + stravaClientRegistration.getScopes());
        System.out.println("CustomStravaResolver: Intended comma-separated scopes: " + commaSeparatedScopes);


        Map<String, Object> additionalParameters = new HashMap<>(authorizationRequest.getAdditionalParameters());
        additionalParameters.put(OAuth2ParameterNames.SCOPE, commaSeparatedScopes);

        String originalUri = authorizationRequest.getAuthorizationRequestUri();
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(originalUri);

        // Replace the 'scope' query parameter with our comma-separated version.
        uriBuilder.replaceQueryParam(OAuth2ParameterNames.SCOPE, commaSeparatedScopes);
        String newUri = uriBuilder.build(true).toUriString(); // `true` means already encoded template variables, but here we just want the query param correctly handled.

        System.out.println("CustomStravaResolver: Original URI: " + originalUri);
        System.out.println("CustomStravaResolver: New URI with comma-separated scopes: " + newUri);

        return OAuth2AuthorizationRequest.from(authorizationRequest)
                .authorizationRequestUri(newUri) // Use the URI with the corrected scope parameter
                .additionalParameters(additionalParameters) // Also update this map
                // .scopes(null) // Optionally clear this if the URI is the sole source of truth for scopes now
                .build();
    }
}