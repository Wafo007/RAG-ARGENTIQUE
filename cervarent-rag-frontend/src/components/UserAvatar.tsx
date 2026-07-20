import { getAvatarColor, getInitials } from '../utils/avatar';
import './UserAvatar.css';

interface UserAvatarProps {
  username: string;
  /** Diamètre en pixels (défaut : 32). */
  size?: number;
}

/**
 * Avatar rond à initiales, généré automatiquement pour tout utilisateur
 * n'ayant pas de photo de profil (voir utils/avatar.ts). Utilisé dans la
 * sidebar de conversations pour identifier visuellement l'utilisateur
 * connecté, façon Claude/Slack.
 */
export default function UserAvatar({ username, size = 32 }: UserAvatarProps) {
  const initials = getInitials(username);
  const color = getAvatarColor(username);

  return (
    <div
      className="user-avatar"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.4),
        backgroundColor: color,
      }}
      role="img"
      aria-label={`Avatar de ${username}`}
      title={username}
    >
      {initials}
    </div>
  );
}
