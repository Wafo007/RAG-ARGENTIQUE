package com.Cervarent.RAG.controller;

import com.Cervarent.RAG.dto.FeedbackRequest;
import com.Cervarent.RAG.entity.MessageFeedback;
import com.Cervarent.RAG.repository.MessageFeedbackRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final MessageFeedbackRepository feedbackRepository;

    @PostMapping
    public ResponseEntity<Map<String, String>> submitFeedback(@Valid @RequestBody FeedbackRequest request) {
        MessageFeedback feedback = new MessageFeedback();
        feedback.setQuestion(request.getQuestion());
        feedback.setAnswer(request.getAnswer());
        feedback.setRating(request.getRating());
        // userId laisse a null pour l'instant : a brancher sur l'utilisateur connecte
        // une fois SecurityContextHolder exploite ici (recuperable via le JWT du filtre)
        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of("status", "success"));
    }
}