import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useOnboardingHint } from '../hooks/useOnboardingHint';
import './OnboardingHint.css';

interface OnboardingHintProps {
  /** Identifiant unique de cette bulle (voir useOnboardingHint). */
  hintId: string;
  /** Texte court expliquant la fonctionnalité. */
  text: string;
  /** Élément ciblé par la bulle (bouton, icône, etc.). */
  children: ReactNode;
  /** Côté d'apparition de la bulle par rapport à l'élément ciblé. */
  placement?: 'bottom' | 'top' | 'right';
}

/**
 * Info-bulle d'onboarding "à la première connexion", façon produit moderne
 * (Notion, Linear, Claude...) : une petite bulle avec une flèche, collée à
 * l'élément qu'elle explique, qui disparaît définitivement une fois lue.
 *
 * Usage : entourer n'importe quel bouton/icône existant avec ce composant.
 * Il ne change RIEN au rendu de l'élément entouré (juste un wrapper
 * `position: relative`) et n'affiche la bulle que si elle n'a jamais été
 * vue par l'utilisateur connecté (voir useOnboardingHint).
 */
export default function OnboardingHint({ hintId, text, children, placement = 'bottom' }: OnboardingHintProps) {
  const { visible, dismiss } = useOnboardingHint(hintId);

  return (
    <span className="onboarding-hint">
      {children}
      {visible && (
        <div className={`onboarding-hint__bubble onboarding-hint__bubble--${placement}`} role="status">
          <p>{text}</p>
          <button type="button" onClick={dismiss} aria-label="Fermer cette astuce">
            <X size={13} />
          </button>
        </div>
      )}
    </span>
  );
}
