package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.Entity.*;
import com.example.shuttlemonitor.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private ParentRepository parentRepository;

    @Autowired
    private DriverRepository driverRepository;

    @Autowired
    private ShuttleRepository shuttleRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    public Message sendMessage(User sender, Long receiverId, String content) {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        if (!canCommunicate(sender, receiver)) {
            throw new IllegalArgumentException("You are not allowed to message this user");
        }

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content);
        return messageRepository.save(message);
    }

    public List<Message> getChatHistory(User user1, Long user2Id) {
        User user2 = userRepository.findById(user2Id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        List<Message> history = messageRepository.findChatHistory(user1, user2);
        
        // Mark received messages as read
        List<Message> unread = history.stream()
                .filter(m -> m.getReceiver().getUserId().equals(user1.getUserId()) && !m.isRead())
                .collect(Collectors.toList());
        
        if (!unread.isEmpty()) {
            unread.forEach(m -> m.setRead(true));
            messageRepository.saveAll(unread);
        }
        
        return history;
    }

    public List<User> getAllowedContacts(User user) {
        List<User> contacts = new ArrayList<>();
        switch (user.getRole()) {
            case STUDENT:
                studentRepository.findByUser(user).ifPresent(s -> {
                    if (s.getParent() != null) contacts.add(s.getParent().getUser());
                });
                break;
            case PARENT:
                parentRepository.findByUser(user).ifPresent(p -> {
                    contacts.addAll(p.getChildren().stream().map(Student::getUser).collect(Collectors.toList()));
                    p.getChildren().forEach(s -> {
                        if (s.getAssignedShuttle() != null) {
                            if (s.getAssignedShuttle().getDriver() != null) contacts.add(s.getAssignedShuttle().getDriver().getUser());
                            if (s.getAssignedShuttle().getOperator() != null) contacts.add(s.getAssignedShuttle().getOperator().getUser());
                        }
                    });
                });
                break;
            case DRIVER:
                driverRepository.findByUser(user).ifPresent(d -> {
                    if (d.getOperator() != null) contacts.add(d.getOperator().getUser());
                    shuttleRepository.findByDriver(d).forEach(shuttle -> {
                        studentRepository.findByAssignedShuttle(shuttle).forEach(s -> {
                            if (s.getParent() != null) contacts.add(s.getParent().getUser());
                        });
                    });
                });
                break;
            case OPERATOR:
                operatorRepository.findByUser(user).ifPresent(o -> {
                    contacts.addAll(o.getDrivers().stream().map(Driver::getUser).collect(Collectors.toList()));
                    contacts.addAll(userRepository.findByRole(Role.ADMIN));
                    shuttleRepository.findByOperator(o).forEach(shuttle -> {
                        studentRepository.findByAssignedShuttle(shuttle).forEach(s -> {
                            if (s.getParent() != null) contacts.add(s.getParent().getUser());
                        });
                    });
                });
                break;
            case ADMIN:
                contacts.addAll(userRepository.findByRole(Role.OPERATOR));
                break;
        }
        return contacts.stream()
                .filter(u -> !u.getUserId().equals(user.getUserId()))
                .distinct()
                .collect(Collectors.toList());
    }

    public boolean canCommunicate(User sender, User receiver) {
        return getAllowedContacts(sender).stream()
                .anyMatch(u -> u.getUserId().equals(receiver.getUserId()));
    }

    public long getUnreadCount(User user) {
        return messageRepository.countUnreadMessages(user);
    }
}
