package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.Route;
import com.example.shuttlemonitor.Repository.RouteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
public class RouteService {
    @Autowired
    private RouteRepository routeRepository;

    public ResponseEntity<Route> createRoute(Route route) {
        routeRepository.save(route);
        return new ResponseEntity<>(route, HttpStatus.CREATED);
    }

    public ResponseEntity<Route> getRoute(Long id) {
        return routeRepository.findById(id)
                .map(route -> new ResponseEntity<>(route, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(null, HttpStatus.NOT_FOUND));
    }
}