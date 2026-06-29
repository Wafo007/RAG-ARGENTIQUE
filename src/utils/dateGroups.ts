import type { Conversation } from '../types/conversation';

export type DateGroupLabel = "Aujourd'hui" | 'Hier' | '7 derniers jours' | '30 derniers jours' | 'Plus ancien';

/**
 * Regroupe une liste de conversations par tranche de date (logique inspirée des
 * interfaces de chat IA grand public), afin de faciliter la navigation dans un
 * historique qui peut vite devenir long.
 *
 * Les conversations épinglées ne passent pas par cette fonction : elles sont
 * affichées séparément, toujours en haut de la sidebar (voir ConversationSidebar.tsx).
 */
export function groupConversationsByDate(
  conversations: Conversation[]
): Array<{ label: DateGroupLabel; conversations: Conversation[] }> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(startOfToday);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const groups: Record<DateGroupLabel, Conversation[]> = {
    "Aujourd'hui": [],
    Hier: [],
    '7 derniers jours': [],
    '30 derniers jours': [],
    'Plus ancien': [],
  };

  for (const conv of conversations) {
    const updated = new Date(conv.updatedAt);
    if (updated >= startOfToday) groups["Aujourd'hui"].push(conv);
    else if (updated >= startOfYesterday) groups.Hier.push(conv);
    else if (updated >= sevenDaysAgo) groups['7 derniers jours'].push(conv);
    else if (updated >= thirtyDaysAgo) groups['30 derniers jours'].push(conv);
    else groups['Plus ancien'].push(conv);
  }

  // On ne retourne que les groupes non vides, dans un ordre chronologique fixe,
  // plutôt que de laisser le composant d'affichage gérer cette logique de tri.
  return (Object.keys(groups) as DateGroupLabel[])
    .map((label) => ({ label, conversations: groups[label] }))
    .filter((group) => group.conversations.length > 0);
}
