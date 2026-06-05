package com.Cervarent.RAG;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Point d'entrée de l'application RAG.
 * @EnableAsync active le traitement asynchrone (mode "instant").
 */
@SpringBootApplication
@EnableAsync
public class RagApplication {

	public static void main(String[] args) {
		SpringApplication.run(RagApplication.class, args);
	}
}