/**
 * Génère un avatar "par défaut" à partir d'un nom d'utilisateur, dans le
 * même esprit que Claude/Slack/GitHub : initiales sur un fond coloré,
 * la couleur étant toujours la même pour un même nom (déterministe).
 *
 * Le système d'authentification actuel (voir types/auth.ts) ne stocke pas
 * de photo de profil : cet avatar généré sert donc TOUJOURS de repli,
 * jusqu'à l'ajout éventuel d'un vrai champ "avatarUrl" côté backend.
 */

/**
 * Palette dérivée des couleurs de marque déjà présentes dans
 * styles/global.css (verts CERVARENT + quelques teintes d'accent),
 * pour que les avatars restent visuellement cohérents avec le reste
 * du site plutôt que d'introduire des couleurs arbitraires.
 */
const AVATAR_PALETTE = [
  '#16a34a', // primary
  '#0f7a37', // primary-dark
  '#22c55e', // primary-light
  '#0e7490', // cyan (variation harmonieuse, même famille froide que le dark bg)
  '#7c3aed', // violet (accent neutre, ne casse pas l'identité verte)
  '#d97706', // warning (déjà utilisé ailleurs dans l'UI pour le score moyen)
  '#0369a1', // bleu profond
];

/** Hash simple et stable (djb2) pour dériver un index de palette d'une chaîne. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
}

/** Extrait 1 ou 2 initiales lisibles à partir d'un nom d'utilisateur. */
export function getInitials(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) return '?';

  // Gère "jean.dupont", "jean_dupont", "jean dupont" -> "JD"
  const parts = trimmed.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** Couleur de fond déterministe pour un nom d'utilisateur donné. */
export function getAvatarColor(username: string): string {
  const index = hashString(username || 'utilisateur') % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}
