import { ASSET_TYPE_LABELS } from '../../services/claimRules';
import Icon from './Icon';

const ICONS = { BANK: 'bank', INSURANCE: 'shield' };

/** Icon + label that tells bank and insurance records apart at a glance. */
export default function AssetTypeBadge({ type }) {
  return (
    <span className={`type-badge type-badge--${type === 'BANK' ? 'bank' : 'insurance'}`}>
      <Icon name={ICONS[type] ?? 'file'} size={14} />
      {ASSET_TYPE_LABELS[type] ?? type}
    </span>
  );
}
