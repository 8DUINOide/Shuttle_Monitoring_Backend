package com.example.shuttlemonitor;

import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class ShuttleMonitoringApplication {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	public static void main(String[] args) {
		SpringApplication.run(ShuttleMonitoringApplication.class, args);
	}

	@Bean
	public CommandLineRunner initAdminUser() {
		return args -> {
			if (userRepository.findByUsername("admin").isEmpty()) {
				User admin = new User();
				admin.setUsername("admin");
				admin.setEmail("admin@gmail.com");
				admin.setPassword(passwordEncoder.encode("admin"));
				admin.setRole("ADMIN");
				userRepository.save(admin);
			}
		};
	}
}
