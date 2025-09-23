package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Parent;
import com.example.shuttlemonitor.Repository.ParentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class ParentService {
    @Autowired
    private ParentRepository parentRepository;

    public ResponseEntity<Parent> createParent(Parent parent) {
        parentRepository.save(parent);
        return new ResponseEntity<>(parent, HttpStatus.CREATED);
    }

    public ResponseEntity<Parent> getParent(Long userId) {
        return parentRepository.findById(userId)
                .map(parent -> new ResponseEntity<>(parent, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}