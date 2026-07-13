import axios from 'axios';
import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth';

/**
 * Client dédié à l'authentification (POST /api/auth/register, /api/auth/login).
 * Volontairement séparé de ragApi.ts : ces appels se font avant d'avoir un
 * token JWT, donc pas besoin (et pas de risque de conflit) avec
 * l'intercepteur qui attache le token sur les autres requêtes.
 */
const authClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Extrait un message d'erreur lisible depuis une réponse Axios en erreur. */
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
      throw new Error(extractErrorMessage(error, 'Impossible de créer le compte.'));
    }
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const { data } = await authClient.post<AuthResponse>('/auth/login', payload);
      return data;
    } catch (error) {
      throw new Error(extractErrorMessage(error, 'Identifiants incorrects.'));
    }
  },
};
