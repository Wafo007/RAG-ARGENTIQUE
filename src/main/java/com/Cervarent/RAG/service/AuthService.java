package com.Cervarent.RAG.service;

import com.Cervarent.RAG.dto.auth.*;
import com.Cervarent.RAG.entity.PasswordResetToken;
import com.Cervarent.RAG.entity.User;
import com.Cervarent.RAG.repository.PasswordResetTokenRepository;
import com.Cervarent.RAG.repository.UserRepository;
import com.Cervarent.RAG.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est deja pris.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Cet email est deja utilise.");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getUsername());
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // Accepte soit le username soit l'email dans le champ "username" du formulaire
        User user = userRepository.findByUsername(request.getUsername())
                .or(() -> userRepository.findByEmail(request.getUsername()))
                .orElseThrow(() -> new IllegalArgumentException("Identifiants incorrects."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants incorrects.");
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .build();
    }

    /**
     * Genere un token de reinitialisation et envoie l'email correspondant.
     * Ne revele jamais si l'email existe ou non (bonne pratique de securite :
     * evite l'enumeration de comptes existants).
     */
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();

            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setToken(token);
            resetToken.setUserId(user.getId());
            resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
            resetTokenRepository.save(resetToken);

            emailService.sendPasswordResetEmail(user.getEmail(), token);
        });
        // Meme si l'email n'existe pas, on ne le dit pas au frontend (message generique)
    }

    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = resetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new IllegalArgumentException("Lien de reinitialisation invalide."));

        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Ce lien a expire ou a deja ete utilise. Refaites une demande.");
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new IllegalStateException("Utilisateur introuvable."));

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        log.info("Mot de passe reinitialise pour l'utilisateur {}", user.getUsername());
    }
}