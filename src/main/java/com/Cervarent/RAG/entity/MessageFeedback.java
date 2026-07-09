package com.Cervarent.RAG.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "message_feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MessageFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String question;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String answer;

    // "UP" ou "DOWN"
    @Column(nullable = false)
    private String rating;

    @Column(name = "user_id")
    private Long userId; // nullable : on peut aussi accepter le feedback d'un anonyme

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}