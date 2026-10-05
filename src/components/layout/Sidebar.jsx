import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '../../routes/navigation';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

export default function Sidebar({ open, onClose }) {
  return (
    <>
      <div
        className={`sidebar-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Primary">
        <div className="sidebar__brand">
          <Logo tone="light" />
          <button className="icon-btn sidebar__close" onClick={onClose} aria-label="Close menu">
            <Icon name="close" size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_SECTIONS.map((section) => (
            <div className="sidebar__section" key={section.title}>
              <p className="sidebar__heading">{section.title}</p>
              <ul>
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
                    >
                      <Icon name={item.icon} size={18} />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar__footer">
          <Icon name="info" size={16} />
          <p>
            <strong>Demo environment</strong>
            All records shown are fictional sample data.
          </p>
        </div>
      </aside>
    </>
  );
}
