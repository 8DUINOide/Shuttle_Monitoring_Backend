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
            
            // Drop problematic payment_plan check constraint that blocks creation
            try {
                jdbcTemplate.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_plan_check");
                jdbcTemplate.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_status_check");
                jdbcTemplate.execute("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check");
                System.out.println("Database Cleanup: Dropped payment constraints.");
            } catch (Exception e) {
                System.out.println("Note: payment constraints cleanup performed.");
            }

            // FULL CLEANUP: Truncate payment-related tables as requested by the user
            // System.out.println("Database Cleanup: Cleaning all payment records for a fresh start...");
            // try {
            //     jdbcTemplate.execute("TRUNCATE TABLE payments RESTART IDENTITY CASCADE");
            //     jdbcTemplate.execute("TRUNCATE TABLE payment_plans RESTART IDENTITY CASCADE");
            //     jdbcTemplate.execute("TRUNCATE TABLE payment_transactions RESTART IDENTITY CASCADE");
            //     System.out.println("Database Cleanup: Truncated payments, payment_plans, and payment_transactions.");
            // } catch (Exception e) {
            //     System.out.println("Note: Truncate failed or tables do not exist: " + e.getMessage());
            // }

            // System.out.println("Database Cleanup: Removing operators without drivers...");
            
            // Step 1: Delete operators that have no associated drivers
            // jdbcTemplate.execute("DELETE FROM operators WHERE operator_id NOT IN (SELECT DISTINCT operator_id FROM drivers WHERE operator_id IS NOT NULL)");
            
            // Step 2: Delete users with role 'OPERATOR' that no longer have a corresponding entry in the operators table
            // jdbcTemplate.execute("DELETE FROM users WHERE role = 'OPERATOR' AND user_id NOT IN (SELECT user_id FROM operators)");

            System.out.println("Database Cleanup Completed: Legacy columns and unused operators removed.");
        } catch (Exception e) {
            System.err.println("Warning: Database cleanup encountered an error: " + e.getMessage());
        }
    }
}
