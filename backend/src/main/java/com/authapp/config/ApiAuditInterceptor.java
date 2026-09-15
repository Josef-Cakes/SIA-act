package com.authapp.config;

import com.authapp.security.JwtAuthenticationFilter;
import com.authapp.service.EventLogger;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class ApiAuditInterceptor implements HandlerInterceptor {

    private static final String AUDIT_ACTION_ATTRIBUTE = "audit.action";
    private static final String AUDIT_TARGET_ATTRIBUTE = "audit.targetId";
    private static final Pattern PROFILE_PATH_PATTERN = Pattern.compile("^/api/user/profile/(\\d+)$");
    private static final Pattern PASSWORD_PATH_PATTERN = Pattern.compile("^/api/user/password/(\\d+)$");
    private static final Pattern PHOTO_PATH_PATTERN = Pattern.compile("^/api/user/photo/(\\d+)$");
    private static final Pattern NUMERIC_SEGMENT_PATTERN = Pattern.compile("/(\\d+)(?:/|$)");
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final EventLogger eventLogger;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String requestUri = request.getRequestURI();
        Long authenticatedUserId = getAuthenticatedUserId(request);

        if (authenticatedUserId != null && isOwnedUserResource(requestUri)) {
            Long requestedUserId = extractOwnedResourceId(requestUri);
            if (requestedUserId != null && !requestedUserId.equals(authenticatedUserId)) {
                eventLogger.logActivity(
                        authenticatedUserId,
                        "SUSPICIOUS_ACCESS",
                        requestedUserId,
                        resolveClientIp(request)
                );
                response.setContentType("application/json");
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("{\"success\":false,\"message\":\"Forbidden: You can only access your own profile\"}");
                return false;
            }

            if (isProfileRequest(requestUri, request.getMethod())) {
                request.setAttribute(AUDIT_ACTION_ATTRIBUTE, "VIEW_PROFILE");
                request.setAttribute(AUDIT_TARGET_ATTRIBUTE, requestedUserId);
                return true;
            }
        }

        if (authenticatedUserId != null && MUTATING_METHODS.contains(request.getMethod())) {
            String action = resolveAction(requestUri, request.getMethod());
            if (action != null) {
                request.setAttribute(AUDIT_ACTION_ATTRIBUTE, action);
                request.setAttribute(AUDIT_TARGET_ATTRIBUTE, extractTargetId(requestUri));
            }
        }

        return true;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex
    ) {
        if (response.getStatus() >= 400 || ex != null) {
            return;
        }

        String action = (String) request.getAttribute(AUDIT_ACTION_ATTRIBUTE);
        if (action == null) {
            return;
        }

        Long authenticatedUserId = getAuthenticatedUserId(request);
        Long targetId = (Long) request.getAttribute(AUDIT_TARGET_ATTRIBUTE);

        eventLogger.logActivity(
                authenticatedUserId,
                action,
                targetId,
                resolveClientIp(request)
        );
    }

    private boolean isProfileRequest(String requestUri, String method) {
        return "GET".equalsIgnoreCase(method) && PROFILE_PATH_PATTERN.matcher(requestUri).matches();
    }

    private boolean isOwnedUserResource(String requestUri) {
        return PROFILE_PATH_PATTERN.matcher(requestUri).matches()
                || PASSWORD_PATH_PATTERN.matcher(requestUri).matches()
                || PHOTO_PATH_PATTERN.matcher(requestUri).matches();
    }

    private Long extractOwnedResourceId(String requestUri) {
        Matcher matcher = PROFILE_PATH_PATTERN.matcher(requestUri);
        if (matcher.matches()) {
            return Long.valueOf(matcher.group(1));
        }

        matcher = PASSWORD_PATH_PATTERN.matcher(requestUri);
        if (matcher.matches()) {
            return Long.valueOf(matcher.group(1));
        }

        matcher = PHOTO_PATH_PATTERN.matcher(requestUri);
        if (!matcher.matches()) {
            return null;
        }
        return Long.valueOf(matcher.group(1));
    }

    private Long extractTargetId(String requestUri) {
        Matcher matcher = NUMERIC_SEGMENT_PATTERN.matcher(requestUri);
        Long targetId = null;
        while (matcher.find()) {
            targetId = Long.valueOf(matcher.group(1));
        }
        return targetId;
    }

    private Long getAuthenticatedUserId(HttpServletRequest request) {
        Object value = request.getAttribute(JwtAuthenticationFilter.AUTHENTICATED_USER_ID_ATTR);
        if (value instanceof Long userId) {
            return userId;
        }
        if (value instanceof String userId && !userId.isBlank()) {
            return Long.valueOf(userId);
        }
        return null;
    }

    private String resolveAction(String requestUri, String method) {
        if (requestUri.startsWith("/api/login") || requestUri.startsWith("/api/register")) {
            return null;
        }

        if (requestUri.startsWith("/api/dashboard/log-action")
                || requestUri.startsWith("/api/v1/operations")) {
            return null;
        }

        if (requestUri.contains("/profile/")) {
            return "UPDATE_PROFILE";
        }
        if (requestUri.contains("/password/")) {
            return "CHANGE_PASSWORD";
        }
        if (requestUri.contains("/photo/")) {
            return "UPLOAD_PROFILE_PHOTO";
        }
        if (requestUri.contains("/batches")) {
            return actionFor(method, "BATCH");
        }
        if (requestUri.contains("/events")) {
            return "POST".equalsIgnoreCase(method) ? "UPDATE_BATCH" : actionFor(method, "EVENT");
        }
        if (requestUri.contains("/livestock")) {
            return actionFor(method, "LIVESTOCK");
        }
        if (requestUri.contains("/users/") && requestUri.endsWith("/role")) {
            return "UPDATE_USER_ROLE";
        }
        if (requestUri.contains("/users")) {
            return actionFor(method, "USER");
        }
        if (requestUri.contains("/handler/tasks")) {
            return "UPDATE_HANDLER_TASK";
        }

        return actionFor(method, "API_ACTION");
    }

    private String actionFor(String method, String resource) {
        return switch (method.toUpperCase()) {
            case "POST" -> "CREATE_" + resource;
            case "PUT", "PATCH" -> "UPDATE_" + resource;
            case "DELETE" -> "DELETE_" + resource;
            default -> null;
        };
    }

    private String resolveClientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }
}
