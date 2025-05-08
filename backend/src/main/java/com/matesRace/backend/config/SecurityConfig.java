package com.matesRace.backend.config;

import com.matesRace.backend.security.CustomOAuth2UserService;
import com.matesRace.backend.security.CustomStravaOAuth2AuthorizationRequestResolver; // Your custom resolver
import com.matesRace.backend.security.OAuth2LoginSuccessListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2LoginSuccessListener oauth2LoginSuccessListener; // Still needed for event listening

    @Autowired
    public SecurityConfig(ClientRegistrationRepository clientRegistrationRepository,
                          CustomOAuth2UserService customOAuth2UserService,
                          OAuth2LoginSuccessListener oauth2LoginSuccessListener) {
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oauth2LoginSuccessListener = oauth2LoginSuccessListener;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/").permitAll()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                                .authorizationEndpoint(authorizationEndpoint ->
                                        authorizationEndpoint
                                                .authorizationRequestResolver(authorizationRequestResolver()) // Ensure this is wired
                                )
                                .userInfoEndpoint(userInfo -> userInfo
                                        .userService(this.customOAuth2UserService)
                                )
                        // Success handler removed as per previous discussion for event listening
                );
        return http.build();
    }

    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver() {
        // The base URI for the authorization request. Typically "/oauth2/authorization"
        // This is the part of the path Spring uses to trigger the OAuth2 flow.
        return new CustomStravaOAuth2AuthorizationRequestResolver(this.clientRegistrationRepository, "/oauth2/authorization");
    }
}