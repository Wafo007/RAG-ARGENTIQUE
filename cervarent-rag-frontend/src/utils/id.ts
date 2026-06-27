/**
 * Génère un identifiant unique côté client (UUID v4 si le navigateur le supporte).
 *
 * Utilisé pour les identifiants de conversations et de messages : comme ils sont
 * créés et persistés uniquement côté navigateur (pas de base de données générant
 * un ID auto-incrémenté), il faut un générateur d'ID local.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  // Repli pour les environnements sans crypto.randomUUID (anciens navigateurs
  // ou contextes non sécurisés type http:// sans TLS). Suffisamment unique
  // pour un usage purement local (pas de garantie cryptographique nécessaire ici).
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
