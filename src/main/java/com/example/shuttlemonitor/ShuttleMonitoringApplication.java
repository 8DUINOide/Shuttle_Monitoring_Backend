package com.example.shuttlemonitor;

import com.example.shuttlemonitor.Entity.Role;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
public class ShuttleMonitoringApplication {

	@Autowired
	private UserRepository userRepository;

	@Autowired
	private PasswordEncoder passwordEncoder;

	public static void main(String[] args) {
		SpringApplication.run(ShuttleMonitoringApplication.class, args);
	}

	@PostConstruct
	public void init() {
		// Setting Spring Boot SetTimeZone
		TimeZone.setDefault(TimeZone.getTimeZone("Asia/Manila"));
		System.out.println("JVM Default TimeZone set to Asia/Manila");
	}

	@Bean
	public CommandLineRunner initAdminUser() {
		return args -> {
			if (userRepository.findByUsername("admin") == null) {
				User admin = new User();
				admin.setUsername("admin");
				admin.setEmail("admin@gmail.com");
				admin.setPassword(passwordEncoder.encode("admin"));
				admin.setRole(Role.ADMIN);
				userRepository.save(admin);
				System.out.println("Admin user created: username=admin, email=admin@gmail.com, password=admin");
			}
		};
	}
}