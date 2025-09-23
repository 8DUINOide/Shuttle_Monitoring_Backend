package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Shuttle;
import com.example.shuttlemonitor.Repository.ShuttleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ShuttleService {
    @Autowired
    private ShuttleRepository shuttleRepository;

    public ResponseEntity<Shuttle> createShuttle(Shuttle shuttle) {
        shuttleRepository.save(shuttle);
        return new ResponseEntity<>(shuttle, HttpStatus.CREATED);
    }

    public ResponseEntity<Shuttle> getShuttle(Long id) {
        return shuttleRepository.findById(id)
                .map(shuttle -> new ResponseEntity<>(shuttle, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }

    public ResponseEntity<Shuttle> updateShuttle(Long id, Shuttle shuttle) {
        return shuttleRepository.findById(id)
                .map(existing -> {
                    existing.setName(shuttle.getName());
                    existing.setCapacity(shuttle.getCapacity());
                    existing.setStatus(shuttle.getStatus());
                    existing.setCurrentOccupancy(shuttle.getCurrentOccupancy());
                    existing.setLocationLat(shuttle.getLocationLat());
                    existing.setLocationLng(shuttle.getLocationLng());
                    existing.setDriver(shuttle.getDriver());
                    existing.setRoute(shuttle.getRoute());
                    existing.setLastUpdated(shuttle.getLastUpdated());
                    shuttleRepository.save(existing);
                    return new ResponseEntity<>(existing, HttpStatus.OK);
                })
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }

    public List<Shuttle> getAllShuttles(String sortBy, String sortOrder) {
        String sortField = switch (sortBy.toLowerCase()) {
            case "name" -> "name";
            case "status" -> "status";
            default -> "id";
        };
        Sort sort = Sort.by(sortOrder.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sortField);
        return shuttleRepository.findAll(sort);
    }
}