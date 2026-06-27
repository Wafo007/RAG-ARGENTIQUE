import type { Conversation } from '../types/conversation';

/**
 * Couche de persistance des conversations.
 *
 * Pourquoi un module séparé du hook useConversations ?
 * → Séparation des responsabilités (SRP) : ce fichier sait UNIQUEMENT lire/écrire
 *   dans le localStorage. Le hook, lui, gère uniquement l'état React et la logique
 *   métier (créer, renommer, épingler...). Si un jour cette persistance bascule
 *   vers une vraie API backend (table "conversations" en base), seul ce fichier
 *   change : le hook et les composants qui l'utilisent n'ont rien à modifier.
 */

const STORAGE_KEY = 'cervarent-rag-conversations';

/**
 * Charge toutes les conversations depuis le localStorage.
 * Retourne un tableau vide si rien n'est stocké, si le JSON est corrompu,
 * ou si le localStorage n'est pas disponible (ex : navigation privée stricte).
 * On préfère repartir d'un état vide plutôt que de faire planter l'application.
 */
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // Garde-fou : si le contenu stocké n'est pas un tableau (ex : ancien format
    // incompatible), on l'ignore plutôt que de propager une erreur de type.
    if (!Array.isArray(parsed)) return [];

    return parsed as Conversation[];
  } catch (error) {
    console.error('Impossible de lire les conversations depuis le localStorage', error);
    return [];
  }
}

/**
 * Sauvegarde la liste complète des conversations.
 * On réécrit l'intégralité du tableau à chaque modification : pour le volume de
 * données concerné (quelques dizaines de conversations maximum côté client),
 * c'est largement suffisant et bien plus simple qu'une synchronisation incrémentale.
 */
export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    // Cas typique : quota du localStorage dépassé (très rare pour du texte ;
    // arriverait surtout si l'historique devenait énorme sans jamais être purgé).
    console.error('Impossible de sauvegarder les conversations dans le localStorage', error);
  }
}
