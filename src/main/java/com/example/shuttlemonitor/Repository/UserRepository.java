package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByUsernameOrEmail(String username, String email);

    @Modifying
    @Query("UPDATE User u SET u.password = ?2 WHERE u.email = ?1")
    void updatePassword(String email, String password);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.forgotPasswords WHERE u.userId = ?1")
    Optional<User> findByIdWithDetails(Long userId);
}
