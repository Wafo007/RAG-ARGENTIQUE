package com.Cervarent.RAG.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

/**
 * Service dédié au dialogue avec Supabase Storage via son API REST.
 *
 * Pourquoi une intégration REST "maison" plutôt qu'un SDK ?
 * → Il n'existe pas de SDK Java officiel maintenu par Supabase.
 * → L'API REST de Supabase Storage est simple, stable et documentée :
 * https://supabase.com/docs/guides/storage
 * → On garde ainsi zéro dépendance supplémentaire (RestTemplate est déjà
 * fourni par spring-boot-starter-web).
 *
 * Le bucket est privé : on ne stocke jamais d'URL publique brute. Pour
 * permettre au frontend de télécharger/prévisualiser un fichier, on génère
 * une URL "signée" temporaire (comme le fait Claude pour ses pièces jointes).
 */
@Service
@Slf4j
public class SupabaseStorageService {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-role-key}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket}")
    private String bucket;

    @Value("${supabase.storage.signed-url-expiry-seconds:3600}")
    private int signedUrlExpirySeconds;

    /**
     * Upload le contenu binaire d'un fichier dans le bucket Supabase.
     *
     * Le chemin de stockage est construit comme :
     * {uuid-aleatoire}/{nom-de-fichier-original}
     * → le préfixe UUID évite toute collision entre deux utilisateurs qui
     * uploaderaient un fichier portant le même nom (ex: "rapport.pdf").
     *
     * @param originalFilename nom de fichier tel qu'envoyé par l'utilisateur
     * @param contentType      type MIME du fichier (ex: application/pdf)
     * @param content          contenu binaire brut du fichier
     * @return le chemin de stockage relatif au bucket (à conserver en base,
     *         colonne uploaded_files.storage_path)
     */
    public String upload(String originalFilename, String contentType, byte[] content) {
        String safeName = sanitize(originalFilename);
        String storagePath = UUID.randomUUID() + "/" + safeName;

        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + storagePath;

        HttpHeaders headers = buildAuthHeaders();
        headers.setContentType(
                contentType != null ? MediaType.parseMediaType(contentType) : MediaType.APPLICATION_OCTET_STREAM);
        // "upsert" a false : on ne veut jamais ecraser silencieusement un fichier
        headers.set("x-upsert", "false");

        HttpEntity<byte[]> request = new HttpEntity<>(content, headers);

        try {
            restTemplate.exchange(url, HttpMethod.POST, request, String.class);
            log.info("Fichier '{}' uploadé sur Supabase Storage -> {}", originalFilename, storagePath);
            return storagePath;
        } catch (RestClientException e) {
            log.error("Échec upload Supabase Storage pour '{}'", originalFilename, e);
            throw new RuntimeException("Impossible d'enregistrer le document original dans Supabase Storage : "
                    + e.getMessage(), e);
        }
    }

    /**
     * Télécharge le contenu binaire brut d'un fichier depuis le bucket.
     * Utilisé côté backend quand on doit re-servir le fichier (ex: proxy de
     * téléchargement quand on ne veut pas exposer directement les URLs Supabase).
     */
    public byte[] download(String storagePath) {
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + storagePath;
        HttpHeaders headers = buildAuthHeaders();
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            var response = restTemplate.exchange(url, HttpMethod.GET, request, byte[].class);
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Échec téléchargement Supabase Storage pour '{}'", storagePath, e);
            throw new RuntimeException("Impossible de récupérer le document depuis Supabase Storage : "
                    + e.getMessage(), e);
        }
    }

    /**
     * Génère une URL signée temporaire (valable {@link #signedUrlExpirySeconds}
     * secondes) permettant au navigateur d'accéder directement au fichier
     * (téléchargement ou prévisualisation inline), sans exposer la clé
     * service_role au frontend.
     */
    @SuppressWarnings("unchecked")
    public String createSignedUrl(String storagePath) {
        String url = supabaseUrl + "/storage/v1/object/sign/" + bucket + "/" + storagePath;

        HttpHeaders headers = buildAuthHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Integer>> request = new HttpEntity<>(
                Map.of("expiresIn", signedUrlExpirySeconds), headers);

        try {
            var response = restTemplate.postForObject(url, request, Map.class);
            if (response == null || response.get("signedURL") == null) {
                throw new RuntimeException("Réponse Supabase Storage invalide (pas de signedURL)");
            }
            // Supabase renvoie un chemin relatif type "/storage/v1/object/sign/...token=..."
            return supabaseUrl + response.get("signedURL");
        } catch (RestClientException e) {
            log.error("Échec génération URL signée pour '{}'", storagePath, e);
            throw new RuntimeException("Impossible de générer un lien de téléchargement : " + e.getMessage(), e);
        }
    }

    /** Supprime un fichier du bucket (utilisé quand un document est supprimé de l'index). */
    public void delete(String storagePath) {
        String url = supabaseUrl + "/storage/v1/object/" + bucket + "/" + storagePath;
        HttpHeaders headers = buildAuthHeaders();
        HttpEntity<Void> request = new HttpEntity<>(headers);

        try {
            restTemplate.exchange(url, HttpMethod.DELETE, request, String.class);
            log.info("Fichier supprimé de Supabase Storage : {}", storagePath);
        } catch (RestClientException e) {
            // On log sans bloquer la suppression logique du document (best-effort).
            log.warn("Échec suppression Supabase Storage pour '{}' (ignoré)", storagePath, e);
        }
    }

    /** En-têtes d'authentification communs à tous les appels Supabase Storage. */
    private HttpHeaders buildAuthHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + serviceRoleKey);
        headers.set("apikey", serviceRoleKey);
        return headers;
    }

    /** Nettoie le nom de fichier pour un chemin de stockage sûr (pas d'espaces/accents ambigus). */
    private String sanitize(String filename) {
        if (filename == null || filename.isBlank()) {
            return "fichier";
        }
        String normalized = java.text.Normalizer.normalize(filename, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return normalized.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
