import { Link } from 'react-router-dom';
import Icon from './Icon';

/** Title block at the top of a page: optional back link, title, description, actions. */
export default function PageHeader({ title, description, backTo, backLabel, actions, children }) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        {backTo && (
          <Link className="page-header__back" to={backTo}>
            <Icon name="back" size={14} /> {backLabel}
          </Link>
        )}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
