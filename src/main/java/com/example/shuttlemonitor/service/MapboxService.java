package com.example.shuttlemonitor.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service for interacting with Mapbox Directions API.
 * Provides real-time ETA (distance + duration) calculations.
 */
@Service
public class MapboxService {

    @Value("${mapbox.access.token}")
    private String accessToken;

    private final RestTemplate restTemplate = new RestTemplate();

    private static final String DIRECTIONS_API_URL = 
        "https://api.mapbox.com/directions/v5/mapbox/driving/%s,%s;%s,%s?access_token=%s&geometries=geojson&overview=false";

    /**
     * Get directions (distance and duration) between two points.
     * 
     * @param originLng Origin longitude
     * @param originLat Origin latitude
     * @param destLng Destination longitude
     * @param destLat Destination latitude
     * @return Map containing distance (meters), duration (seconds), and formatted strings
     */
    public Map<String, Object> getDirections(Double originLng, Double originLat, Double destLng, Double destLat) {
        Map<String, Object> result = new HashMap<>();
        
        if (originLng == null || originLat == null || destLng == null || destLat == null) {
            result.put("error", "Missing coordinates");
            result.put("distance", "Unknown");
            result.put("duration", "Unknown");
            result.put("eta", "Unknown");
            return result;
        }

        try {
            String url = String.format(DIRECTIONS_API_URL, 
                originLng, originLat, destLng, destLat, accessToken);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);

            if (response != null && response.containsKey("routes")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
                
                if (!routes.isEmpty()) {
                    Map<String, Object> route = routes.get(0);
                    double distanceMeters = ((Number) route.get("distance")).doubleValue();
                    double durationSeconds = ((Number) route.get("duration")).doubleValue();

                    result.put("distanceMeters", distanceMeters); // Raw value
                    result.put("durationSeconds", durationSeconds); // Raw value
                    result.put("distance", formatDistance(distanceMeters));
                    result.put("duration", formatDuration(durationSeconds));
                    result.put("eta", formatETA(distanceMeters, durationSeconds));
                    return result;
                }
            }

            result.put("error", "No route found");
            result.put("distance", "Unknown");
            result.put("duration", "Unknown");
            result.put("eta", "Unknown");

        } catch (Exception e) {
            result.put("error", e.getMessage());
            result.put("distance", "Unknown");
            result.put("duration", "Unknown");
            result.put("eta", "Unknown");
        }

        return result;
    }

    /**
     * Get ETA string for a shuttle to its destination.
     * This is a convenience method used by ShuttleService.
     */
    public String getETA(Double shuttleLat, Double shuttleLng, Double destLat, Double destLng) {
        Map<String, Object> directions = getDirections(shuttleLng, shuttleLat, destLng, destLat);
        
        if (directions.containsKey("eta")) {
            return (String) directions.get("eta");
        }
        return "Unknown";
    }

    /**
     * Format distance in meters to human-readable string.
     * e.g., 50700 -> "50.7 km"
     */
    private String formatDistance(double meters) {
        if (meters < 1000) {
            return String.format("%.0f m", meters);
        }
        return String.format("%.1f km", meters / 1000);
    }

    /**
     * Format duration in seconds to human-readable string.
     * e.g., 5220 -> "1h 27min"
     */
    private String formatDuration(double seconds) {
        int totalMinutes = (int) Math.round(seconds / 60);
        int hours = totalMinutes / 60;
        int minutes = totalMinutes % 60;

        if (hours > 0) {
            return String.format("%dh %dmin", hours, minutes);
        }
        return String.format("%d min", minutes);
    }

    /**
     * Format combined ETA string.
     * e.g., "50.7 km, 1h 27min"
     */
    private String formatETA(double distanceMeters, double durationSeconds) {
        return formatDistance(distanceMeters) + ", " + formatDuration(durationSeconds);
    }
}
