package com.authapp.repository;

import com.authapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by email (used for login)
    Optional<User> findByEmail(String email);

    // Find user by username
    Optional<User> findByUsername(String username);

    // Check if email already exists (used for registration)
    boolean existsByEmail(String email);

    // Check if username already exists (used for registration)
    boolean existsByUsername(String username);

    // Custom query to update password
    @Modifying
    @Query("UPDATE User u SET u.password = :password WHERE u.id = :id")
    int updatePassword(@Param("id") Long id, @Param("password") String password);

    // Custom query to update profile image
    @Modifying
    @Query("UPDATE User u SET u.profileImage = :image, u.profileImageType = :type WHERE u.id = :id")
    int updateProfileImage(@Param("id") Long id,
                           @Param("image") byte[] image,
                           @Param("type") String type);
}
