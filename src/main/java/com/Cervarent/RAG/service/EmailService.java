package com.Cervarent.RAG.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * VERSION TEMPORAIRE POUR TESTS : n'envoie pas de vrai email,
 * affiche juste le lien dans les logs. A remplacer par la vraie
 * implementation (JavaMailSender) une fois le SMTP configure.
 */
@Service
@Slf4j
public class EmailService {

    public void sendPasswordResetEmail(String toEmail, String token) {
        String resetLink = "http://localhost:5173/reset-password?token=" + token;
        log.info("=== EMAIL SIMULE (mode test) ===");
        log.info("Destinataire : {}", toEmail);
        log.info("Lien de reinitialisation : {}", resetLink);
        log.info("=================================");
    }
}