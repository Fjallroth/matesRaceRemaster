package com.matesRace.backend.config;

import com.matesRace.backend.security.CustomOAuth2UserService;
import com.matesRace.backend.security.CustomStravaOAuth2AuthorizationRequestResolver;
import com.matesRace.backend.security.OAuth2LoginSuccessListener; // Still needed for event listening

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value; // Import for Value
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final ClientRegistrationRepository clientRegistrationRepository;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2LoginSuccessListener oauth2LoginSuccessListener; // Still needed for event listening

    // Inject the frontend URL from application.properties
    @Value("${frontend.url}")
    private String frontendUrl;

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
                        .requestMatchers("/", "/error", "/favicon.ico").permitAll() // Permit basic static resources and error pages
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorizationEndpoint ->
                                authorizationEndpoint
                                        .authorizationRequestResolver(authorizationRequestResolver())
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(this.customOAuth2UserService)
                        )
                        .successHandler(authenticationSuccessHandler()) // Add the success handler here
                );
        return http.build();
    }

    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver() {
        return new CustomStravaOAuth2AuthorizationRequestResolver(this.clientRegistrationRepository, "/oauth2/authorization");
    }

    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return this.oauth2LoginSuccessListener;
    }
}