package com.example.shuttlemonitor.controller;

import com.example.shuttlemonitor.Entity.Message;
import com.example.shuttlemonitor.Entity.User;
import com.example.shuttlemonitor.Repository.UserRepository;
import com.example.shuttlemonitor.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/send")
    public ResponseEntity<Message> sendMessage(@RequestBody Map<String, Object> payload) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        Long receiverId = ((Number) payload.get("receiverId")).longValue();
        String content = (String) payload.get("content");

        try {
            Message message = messageService.sendMessage(currentUser, receiverId, content);
            return ResponseEntity.ok(message);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(null);
        }
    }

    @GetMapping("/history/{otherUserId}")
    public ResponseEntity<List<Message>> getChatHistory(@PathVariable Long otherUserId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(messageService.getChatHistory(currentUser, otherUserId));
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<User>> getContacts() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(messageService.getAllowedContacts(currentUser));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        User currentUser = getCurrentUser();
        if (currentUser == null) return ResponseEntity.status(401).build();

        return ResponseEntity.ok(Map.of("count", messageService.getUnreadCount(currentUser)));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByUsername(auth.getName());
    }
}
