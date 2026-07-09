package com.Cervarent.RAG.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Reponse renvoyee apres une connexion/inscription reussie.
 * Le frontend utilise "username" pour afficher "Bonjour {username}".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String username;
    private String email;
}