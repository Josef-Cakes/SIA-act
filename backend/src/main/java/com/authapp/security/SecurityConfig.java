package com.authapp.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration with Role-Based Access Control (RBAC).
 *
 * Access Rules:
 * - /api/admin/**     → ROLE_ADMIN only
 * - /api/handler/**   → ROLE_HANDLER only
 * - /api/user/**      → Authenticated users (any role)
 * - /api/dashboard/** → Authenticated users (any role)
 * - /api/auth/**      → Public (no auth required)
 * - /health, /        → Public (no auth required)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    // IMPORTANT: Default now includes the Vercel frontend URL.
    // Override in application.properties or as an environment variable on Render:
    //   app.cors.allowed-origins=https://your-frontend.vercel.app,http://localhost:3000
    @Value("${app.cors.allowed-origins:https://sia-act.vercel.app,https://sia-act.onrender.com,http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                // 1) Allow ALL OPTIONS preflight requests — must be first
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // 2) Health check / root
                .requestMatchers("/", "/health").permitAll()

                // 3) Public auth endpoints
                .requestMatchers("/api/login", "/api/register", "/api/auth/**").permitAll()

                // 4) RBAC rules
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/handler/**").hasRole("HANDLER")
                .requestMatchers("/api/user/**").authenticated()

                // 5) Dashboard — requires a valid JWT (any authenticated role)
                .requestMatchers("/api/dashboard/**").authenticated()

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(parseAllowedOrigins());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private List<String> parseAllowedOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
    }
}
