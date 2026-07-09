import { useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './UserGreeting.css';

/** Salutations variees, tirees au hasard a chaque montage (style Claude) */
const GREETINGS = [
  'Bonjour',
  'Ravi de vous revoir',
  'Content de vous revoir',
  'Bon retour',
];

export default function UserGreeting() {
  const { user, logout } = useAuth();

  // useMemo pour ne tirer la salutation qu'une fois par session/rechargement,
  // pas a chaque re-render du composant
  const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

  if (!user) return null;

  return (
    <div className="user-greeting">
      <span className="user-greeting__text">
        <h1>{greeting}, <strong>{user.username}</strong></h1>
      </span>
      <button
        type="button"
        className="user-greeting__logout"
        onClick={logout}
        title="Se déconnecter"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}