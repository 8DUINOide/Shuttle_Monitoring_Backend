package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Stop;
import com.example.shuttlemonitor.Repository.StopRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class StopService {
    @Autowired
    private StopRepository stopRepository;

    public ResponseEntity<Stop> createStop(Stop stop) {
        stopRepository.save(stop);
        return new ResponseEntity<>(stop, HttpStatus.CREATED);
    }

    public ResponseEntity<Stop> getStop(Long id) {
        return stopRepository.findById(id)
                .map(stop -> new ResponseEntity<>(stop, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}