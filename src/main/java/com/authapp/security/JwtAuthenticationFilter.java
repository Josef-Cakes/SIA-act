package com.authapp.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * JWT Authentication Filter.
 * Intercepts requests and validates JWT tokens in the Authorization header.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTHENTICATED_USER_ID_ATTR = "authenticatedUserId";
    public static final String AUTHENTICATED_ROLE_ATTR = "authenticatedRole";

    private final JwtUtil jwtUtil;

    public JwtAuthenticationFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        // Check if Authorization header is present and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            // Validate token
            if (jwtUtil.validateToken(jwt) && !jwtUtil.isTokenExpired(jwt)) {
                Long userId = jwtUtil.extractUserId(jwt);
                String username = jwtUtil.extractUsername(jwt);
                String role = jwtUtil.extractRole(jwt);
                request.setAttribute(AUTHENTICATED_USER_ID_ATTR, userId);
                request.setAttribute(AUTHENTICATED_ROLE_ATTR, role);

                // Create authentication token with role
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority(role))
                );

                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                // Set authentication in security context
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (Exception e) {
            // Token validation failed - continue without authentication
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
