package com.Cervarent.RAG.dto.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordRequest {
    @NotBlank
    private String token;

    @NotBlank
    @Size(min = 8, message = "Le mot de passe doit contenir au moins 8 caracteres")
    private String newPassword;
}