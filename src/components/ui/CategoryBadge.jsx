import { categoryFor } from '../../services/documentRules';
import Icon from './Icon';

/** Says whether a document is case-level, bank-claim or insurance-claim specific. */
export default function CategoryBadge({ category }) {
  const meta = categoryFor(category);
  if (!meta) return null;
  return (
    <span className={`type-badge type-badge--${category.toLowerCase().replace('_', '-')}`}>
      <Icon name={meta.icon} size={14} />
      {meta.label}
    </span>
  );
}
