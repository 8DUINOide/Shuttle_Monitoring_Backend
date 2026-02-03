package com.example.shuttlemonitor.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseCleanup implements CommandLineRunner {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Execute cleanup of legacy columns requested by the user
        // We use try-catch blocks or "IF EXISTS" (PostgreSQL supports it) to ensure safety
        
        System.out.println("Running Database Cleanup: Removing legacy fingerprint columns...");

        try {
            // Drop 'fingerprint_hash' (The original single column)
            jdbcTemplate.execute("ALTER TABLE students DROP COLUMN IF EXISTS fingerprint_hash");
            
            // Drop 'fingerprint_hash_2' (The auto-generated snake_case duplicate)
            jdbcTemplate.execute("ALTER TABLE students DROP COLUMN IF EXISTS fingerprint_hash_2");
            
            // Drop 'fingerprint_hash_3' (The auto-generated snake_case duplicate)
            jdbcTemplate.execute("ALTER TABLE students DROP COLUMN IF EXISTS fingerprint_hash_3");
            
            System.out.println("Database Cleanup Completed: Legacy columns removed.");
        } catch (Exception e) {
            System.err.println("Warning: Database cleanup encountered an error (this is safe to ignore if columns are already gone): " + e.getMessage());
        }
    }
}
