package com.Cervarent.RAG.service;

import com.Cervarent.RAG.dto.auth.AuthResponse;
import com.Cervarent.RAG.dto.auth.LoginRequest;
import com.Cervarent.RAG.dto.auth.RegisterRequest;
import com.Cervarent.RAG.entity.User;
import com.Cervarent.RAG.repository.UserRepository;
import com.Cervarent.RAG.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Service d'authentification : inscription et connexion.
 *
 * Volontairement simple : pas de rôles, pas de mot de passe oublié, pas
 * d'email de confirmation. Un utilisateur = un couple (username, password)
 * qui donne droit à un token JWT valable 24h. C'est suffisant pour un
 * projet de fin d'études où l'objectif est de protéger l'accès au RAG,
 * pas de construire un système de gestion d'identité complet.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Crée un nouveau compte utilisateur.
     * Le mot de passe n'est jamais stocké en clair : il est haché avec BCrypt
     * avant d'être enregistré (voir SecurityConfig.passwordEncoder()).
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est déjà pris.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        log.info("Nouveau compte créé : {}", user.getUsername());
        return buildAuthResponse(user);
    }

    /**
     * Vérifie les identifiants et renvoie un token JWT si valides.
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Identifiants incorrects."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants incorrects.");
        }

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtUtil.generateToken(user.getUsername());
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .build();
    }
}
