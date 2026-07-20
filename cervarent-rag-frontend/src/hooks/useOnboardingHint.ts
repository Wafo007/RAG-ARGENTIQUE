import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Préfixe localStorage commun à toutes les info-bulles d'onboarding, pour
 * pouvoir les lister/réinitialiser facilement (ex: bouton "Revoir les
 * astuces" dans un futur écran de paramètres).
 */
const STORAGE_PREFIX = 'cervarent_onboarding_seen_';

/**
 * Gère l'affichage "à la première connexion" d'une info-bulle donnée.
 *
 * Chaque bulle a un identifiant unique (`hintId`, ex: "sidebar-toggle").
 * L'état "vue" est mémorisé PAR UTILISATEUR (clé = nom d'utilisateur) afin
 * que deux comptes différents sur la même machine voient chacun les astuces
 * une fois, et qu'un utilisateur qui a déjà tout vu ne soit plus jamais
 * interrompu.
 *
 * @param hintId identifiant stable de la bulle (unique dans toute l'app)
 * @returns { visible, dismiss } — `visible` indique si la bulle doit
 *          s'afficher maintenant ; `dismiss()` la marque comme vue.
 */
export function useOnboardingHint(hintId: string) {
  const { user } = useAuth();
  const storageKey = `${STORAGE_PREFIX}${user?.username ?? 'anonyme'}_${hintId}`;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Pas d'utilisateur connu pour l'instant (chargement initial de l'auth) :
    // on attend avant de décider quoi que ce soit, pour ne jamais afficher
    // une bulle "au nom de personne".
    if (!user) return;
    const alreadySeen = localStorage.getItem(storageKey) === 'true';
    setVisible(!alreadySeen);
  }, [user, storageKey]);

  const dismiss = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setVisible(false);
  }, [storageKey]);

  return { visible, dismiss };
}
