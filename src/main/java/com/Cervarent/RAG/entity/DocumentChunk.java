package com.Cervarent.RAG.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "document_chunks")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentChunk {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "document_title", nullable = false)
    private String documentTitle;
    
    @Column(name = "content", length = 4000, nullable = false)
    private String content;
    
    @Column(name = "chunk_index")
    private Integer chunkIndex;
    
    // SUPPRESSION de @JdbcTypeCode - on utilise String directement
    // Le format PostgreSQL vector est : [0.1, 0.2, 0.3, ...]
    @Column(name = "embedding", columnDefinition = "vector(1024)")
    private String embedding;
    
    @Column(name = "source")
    private String source;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}