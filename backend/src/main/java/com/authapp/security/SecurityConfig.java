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
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
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
 * - /api/admin/**  → ROLE_ADMIN only
 * - /api/handler/** → ROLE_HANDLER only
 * - /api/user/** → Authenticated users (any role)
 * - /api/login, /api/register → Public (no auth required)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF for REST API
            .csrf(AbstractHttpConfigurer::disable)

            // JWT is the only supported authentication mechanism. Do not
            // expose Spring's generated Basic/form-login credentials.
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)

            // Configure CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Stateless session (JWT-based)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Authorization rules
            .authorizeHttpRequests(auth -> auth
                // Public endpoints (no authentication required)
                .requestMatchers(HttpMethod.GET, "/health").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/login", "/api/register").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Legacy/demo APIs are not a second write path. They expose
                // raw entities and do not carry farm/assignment context.
                // Keep them disabled until they are replaced by versioned,
                // scoped DTO endpoints.
                .requestMatchers("/api/farmville/**", "/api/profiles/**").denyAll()
                .requestMatchers("/api/dashboard/log-action").denyAll()
                // Generic handler log writes bypass operation typing and are
                // intentionally retired in favor of /api/v1/operations.
                .requestMatchers("/api/handler/logs").denyAll()

                // Admin-only endpoints
                .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/analytics/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/inventory/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/api/logs/**").hasAuthority("ROLE_ADMIN")

                // Handler-only endpoints
                .requestMatchers("/api/handler/**").hasAuthority("ROLE_HANDLER")

                // Profile photo endpoints (public read for avatars, authenticated write)
                .requestMatchers(HttpMethod.GET, "/api/user/photo/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/user/photo/**").authenticated()

                // User endpoints (any authenticated user)
                .requestMatchers("/api/user/**").authenticated()

                // All other requests require authentication
                .anyRequest().authenticated()
            )

            // Custom exception handling for unauthorized/forbidden requests
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType("application/json");
                    response.setStatus(401);
                    response.getWriter().write("{\"success\":false,\"message\":\"Unauthorized: Authentication required\"}");
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    response.setContentType("application/json");
                    response.setStatus(403);
                    response.getWriter().write("{\"success\":false,\"message\":\"Forbidden: Insufficient permissions\"}");
                })
            )

            // Add JWT filter before UsernamePasswordAuthenticationFilter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(parseAllowedOrigins());
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
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

    /**
     * Prevent Spring Boot from creating and advertising a random development
     * password. Authentication is handled by the JWT filter and database
     * users; this deliberately empty service is never used for login.
     */
    @Bean
    public UserDetailsService userDetailsService() {
        return new InMemoryUserDetailsManager();
    }

    private List<String> parseAllowedOrigins() {
        return Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toList();
    }
}
