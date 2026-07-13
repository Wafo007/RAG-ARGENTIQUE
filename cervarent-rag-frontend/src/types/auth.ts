/**
 * Types correspondant aux DTOs Java du package com.Cervarent.RAG.dto.auth.
 *
 * Auth simplifiée à l'essentiel : un username + un password, sans email ni
 * mot de passe oublié (fonctionnalité volontairement retirée du projet).
 */

export interface AuthResponse {
  token: string;
  username: string;
}

export interface RegisterPayload {
  username: string;
  password: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

/** Utilisateur actuellement connecté, conservé en mémoire + localStorage */
export interface AuthUser {
  username: string;
  token: string;
}
