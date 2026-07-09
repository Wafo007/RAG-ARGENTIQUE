package com.Cervarent.RAG.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class FeedbackRequest {
    @NotBlank
    private String question;

    @NotBlank
    private String answer;

    @Pattern(regexp = "UP|DOWN", message = "rating doit valoir UP ou DOWN")
    private String rating;
}