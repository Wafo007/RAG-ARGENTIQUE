package com.Cervarent.RAG.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Resume d'un document indexe pour la vue "bibliotheque documentaire".
 * Un document = un regroupement de chunks partageant le meme "source".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentSummary {
    private String source;          // nom du fichier
    private String documentTitle;   // titre affiche
    private int chunksCount;        // nombre de chunks indexes pour ce document
    private long totalCharacters;   // taille totale du contenu indexe (proxy de la taille)
    private LocalDateTime addedAt;  // date du premier chunk indexe (approxime la date d'ajout)
}