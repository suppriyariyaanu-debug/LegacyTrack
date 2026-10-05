import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getNotifications, onDataChange } from '../services/api';
import { useAuth } from './AuthContext';
import { useActiveCase } from './CaseContext';

/**
 * Keeps the unread-notification count for the active case available to the
 * app shell (the bell in the header). It re-reads whenever the active case or
 * the underlying data changes.
 */
const NotificationsContext = createContext({ unreadCount: 0, refresh: () => {} });

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { activeId } = useActiveCase();
  const [unreadCount, setUnreadCount] = useState(0);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  // Any change to the demo data may add, clear or re-mark notifications.
  useEffect(() => onDataChange(refresh), [refresh]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return undefined;
    }
    let cancelled = false;
    getNotifications(activeId)
      .then((list) => !cancelled && setUnreadCount(list.filter((n) => !n.read).length))
      .catch(() => !cancelled && setUnreadCount(0));
    return () => {
      cancelled = true;
    };
  }, [activeId, user, version]);

  const value = useMemo(() => ({ unreadCount, refresh }), [unreadCount, refresh]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
