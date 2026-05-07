package com.authapp.config;

import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Data initializer that creates default admin account on application startup.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-admin.enabled:false}")
    private boolean defaultAdminEnabled;

    @Value("${app.default-admin.username:}")
    private String adminUsername;

    @Value("${app.default-admin.email:}")
    private String adminEmail;

    @Value("${app.default-admin.password:}")
    private String adminPassword;

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (!defaultAdminEnabled) {
            logger.info("Default admin bootstrap is disabled.");
            return;
        }

        createDefaultAdminIfNotExists();
    }

    private void createDefaultAdminIfNotExists() {
        validateDefaultAdminConfig();

        if (userRepository.existsByUsername(adminUsername)) {
            logger.info("Default admin account already exists: {}", adminUsername);
            return;
        }

        User admin = User.builder()
                .username(adminUsername)
                .email(adminEmail)
                .password(passwordEncoder.encode(adminPassword))
                .role(Role.ROLE_ADMIN)
                .fullName("System Administrator")
                .build();

        userRepository.save(admin);
        logger.info("Default admin account created: {}", adminUsername);
        logger.info("  Role: ROLE_ADMIN");
    }

    private void validateDefaultAdminConfig() {
        if (adminUsername.isBlank() || adminEmail.isBlank() || adminPassword.isBlank()) {
            throw new IllegalStateException(
                    "Default admin bootstrap requires APP_DEFAULT_ADMIN_USERNAME, APP_DEFAULT_ADMIN_EMAIL, and APP_DEFAULT_ADMIN_PASSWORD."
            );
        }
    }
}
