import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { findNavItem } from '../../routes/navigation';
import Icon from '../ui/Icon';
import GlobalSearch from './GlobalSearch';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const title = findNavItem(pathname)?.label ?? 'LegacyTrack';

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="header">
      <button className="icon-btn header__menu" onClick={onMenuClick} aria-label="Open menu">
        <Icon name="menu" />
      </button>

      <h1 className="header__title">{title}</h1>

      <GlobalSearch />

      <div className="header__actions">
        <Link
          to="/notifications"
          className="icon-btn header__bell"
          aria-label={
            unreadCount === 1 ? 'Notifications, 1 unread' : `Notifications, ${unreadCount} unread`
          }
        >
          <Icon name="bell" />
          {unreadCount > 0 && (
            <span className="header__bell-count" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="account" ref={menuRef}>
          <button
            className="account__trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Account menu for ${user.name}`}
          >
            <span className="avatar" aria-hidden="true">
              {user.initials}
            </span>
            <span className="account__meta">
              <span className="account__name">{user.name}</span>
              <span className="account__role">{user.relationship}</span>
            </span>
          </button>

          {menuOpen && (
            <div className="account__menu" role="menu">
              <p className="account__email">{user.email}</p>
              <Link to="/settings" role="menuitem" onClick={() => setMenuOpen(false)}>
                <Icon name="settings" size={16} /> Profile &amp; Settings
              </Link>
              <button role="menuitem" onClick={handleLogout}>
                <Icon name="logout" size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
