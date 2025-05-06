package com.matesRace.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import static org.springframework.security.config.Customizer.withDefaults; // Import withDefaults

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .authorizeHttpRequests(authorize -> authorize
                        // Allow access to root path without authentication (if desired)
                        .requestMatchers("/").permitAll()
                        // Require authentication for any other request for now
                        .anyRequest().authenticated()
                )
                // Enable OAuth2 Login with default settings for now
                .oauth2Login(withDefaults()); // Use withDefaults() for basic setup

        // You might add CORS configuration here later: .cors(withDefaults())

        return http.build();
    }
}