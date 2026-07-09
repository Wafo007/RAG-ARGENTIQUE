import axios from 'axios';
import type {
  AuthResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '../types/auth';

// Client dedie a l'authentification : PAS d'intercepteur JWT ici,
// car ces appels se font justement AVANT d'avoir un token (ou pour le
// mot de passe oublie, sans jamais en avoir besoin).
const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Extrait un message d'erreur lisible depuis une reponse Axios en erreur */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message as string;
  }
  return fallback;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>('/auth/register', payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Impossible de créer le compte."));
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>('/auth/login', payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Identifiants incorrects."));
    }
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<string> {
    try {
      const { data } = await authClient.post<{ message: string }>('/auth/forgot-password', payload);
      return data.message;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Une erreur est survenue."));
    }
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<string> {
    try {
      const { data } = await authClient.post<{ message: string }>('/auth/reset-password', payload);
      return data.message;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Lien invalide ou expiré."));
    }
  },
};