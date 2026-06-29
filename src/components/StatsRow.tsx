import './StatsRow.css';

interface StatItem {
  label: string;
  value: string;
}

interface StatsRowProps {
  stats: StatItem[];
}

/**
 * Rangée de cartes statistiques (ex : "Publications totales", "Articles"...).
 * Purement visuelle pour l'instant : les valeurs sont passées en props
 * et peuvent être branchées sur une future API de statistiques.
 */
export default function StatsRow({ stats }: StatsRowProps) {
  return (
    <div className="stats-row">
      {stats.map((stat) => (
        <div className="stats-row__card" key={stat.label}>
          <span className="stats-row__value">{stat.value}</span>
          <span className="stats-row__label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
