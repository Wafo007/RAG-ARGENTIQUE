/** Types correspondant aux DTOs Java du package auth (voir backend) */

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  username: string; // accepte aussi l'email cote backend
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

/** Utilisateur actuellement connecte, stocke en memoire + localStorage */
export interface AuthUser {
  username: string;
  email: string;
  token: string;
}