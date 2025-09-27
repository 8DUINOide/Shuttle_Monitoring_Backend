package com.example.shuttlemonitor.service;

import com.example.shuttlemonitor.dto.MailBody;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendSimpleMessage(MailBody mailBody) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(mailBody.to());
        message.setFrom("alfrancis@example.com");
        message.setSubject(mailBody.subject());
        message.setText(mailBody.text());
        mailSender.send(message);
    }
}