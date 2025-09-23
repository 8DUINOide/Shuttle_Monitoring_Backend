package com.example.shuttlemonitor.Repository;

import com.example.shuttlemonitor.Entity.ForgotPassword;
import com.example.shuttlemonitor.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ForgotPasswordRepository extends JpaRepository<ForgotPassword, Integer> {
    @Query("select fp from ForgotPassword fp where fp.otp = ?1 and fp.user = ?2")
    Optional<ForgotPassword> findByOtpAndUser(Integer otp, User user);

    @Modifying
    @Query("DELETE FROM ForgotPassword fp WHERE fp.user = ?1")
    void deleteByUser(User user);
}
