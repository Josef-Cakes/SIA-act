package com.authapp.repository;

import com.authapp.entity.Role;
import com.authapp.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by email (used for profile updates)
    Optional<User> findByEmail(String email);

    // Find user by username (used for login - primary credential)
    Optional<User> findByUsername(String username);

    // Check if email already exists (used for registration)
    boolean existsByEmail(String email);

    // Check if username already exists (used for registration)
    boolean existsByUsername(String username);

    // Find all users by role (admin management)
    List<User> findByRole(Role role);

    List<User> findByRoleOrderByFullNameAsc(Role role);

    // Count users by role (admin statistics)
    long countByRole(Role role);

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
