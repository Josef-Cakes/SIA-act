package com.authapp.config;

import com.authapp.entity.Role;
import com.authapp.entity.User;
import com.authapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    // Default admin credentials
    private static final String ADMIN_USERNAME = "admin_sef";
    private static final String ADMIN_EMAIL = "admin@farmville.com";
    private static final String ADMIN_PASSWORD = "Admin@FarmVille2024";

    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        createDefaultAdminIfNotExists();
    }

    private void createDefaultAdminIfNotExists() {
        if (userRepository.existsByUsername(ADMIN_USERNAME)) {
            logger.info("Default admin account already exists: {}", ADMIN_USERNAME);
            return;
        }

        User admin = User.builder()
                .username(ADMIN_USERNAME)
                .email(ADMIN_EMAIL)
                .password(passwordEncoder.encode(ADMIN_PASSWORD))
                .role(Role.ROLE_ADMIN)
                .fullName("System Administrator")
                .build();

        userRepository.save(admin);
        logger.info("✓ Default admin account created: {}", ADMIN_USERNAME);
        logger.info("  Username: {}", ADMIN_USERNAME);
        logger.info("  Role: ROLE_ADMIN");
    }
}
