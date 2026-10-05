import Icon from './Icon';

/** Dashboard summary tile. `tone` only tints the icon chip. */
export default function StatCard({ icon, label, value, hint, tone = 'brand' }) {
  return (
    <article className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}>
        <Icon name={icon} size={18} />
      </div>
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
      {hint && <p className="stat-card__hint">{hint}</p>}
    </article>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card" aria-hidden="true">
      <div className="skeleton skeleton--chip" />
      <div className="skeleton skeleton--line" style={{ width: '60%' }} />
      <div className="skeleton skeleton--title" style={{ width: '45%' }} />
      <div className="skeleton skeleton--line" style={{ width: '70%' }} />
    </div>
  );
}
