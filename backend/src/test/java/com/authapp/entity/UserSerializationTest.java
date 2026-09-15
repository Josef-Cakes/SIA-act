package com.authapp.entity;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

class UserSerializationTest {

    @Test
    void sensitiveUserFieldsAreNeverSerialized() throws Exception {
        User user = User.builder()
                .id(1L)
                .username("handler")
                .email("handler@example.com")
                .password("$2a$10$private-hash")
                .profileImage(new byte[]{1, 2, 3})
                .profileImageType("image/png")
                .build();

        String json = new ObjectMapper().findAndRegisterModules().writeValueAsString(user);

        assertFalse(json.contains("private-hash"));
        assertFalse(json.contains("profileImage"));
        assertFalse(json.contains("profileImageType"));
    }
}
