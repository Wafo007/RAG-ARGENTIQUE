package com.Cervarent.RAG.repository;

import com.Cervarent.RAG.entity.MessageFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageFeedbackRepository extends JpaRepository<MessageFeedback, Long> {
}