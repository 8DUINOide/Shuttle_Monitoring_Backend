package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Route;
import com.example.shuttlemonitor.service.RouteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    @Autowired
    private RouteService routeService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> createRoute(@RequestBody Route route) {
        Map<String, String> response = new HashMap<>();
        ResponseEntity<Route> result = routeService.createRoute(route);
        if (result.getStatusCode() == HttpStatus.CREATED) {
            response.put("message", "Route created successfully");
        } else {
            response.put("error", "Failed to create route");
        }
        return new ResponseEntity<>(response, result.getStatusCode());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Route> getRoute(@PathVariable Long id) {
        return routeService.getRoute(id);
    }
}