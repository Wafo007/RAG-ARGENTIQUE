package com.Cervarent.RAG.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank
    private String username; // accepte aussi l'email, voir AuthService

    @NotBlank
    private String password;
}