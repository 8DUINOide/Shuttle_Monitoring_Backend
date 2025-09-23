package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Admin;
import com.example.shuttlemonitor.Repository.AdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class AdminService {
    @Autowired
    private AdminRepository adminRepository;

    public ResponseEntity<Admin> createAdmin(Admin admin) {
        adminRepository.save(admin);
        return new ResponseEntity<>(admin, HttpStatus.CREATED);
    }

    public ResponseEntity<Admin> getAdmin(Long userId) {
        return adminRepository.findById(userId)
                .map(admin -> new ResponseEntity<>(admin, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}