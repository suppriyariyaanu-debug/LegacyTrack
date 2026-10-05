import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import {
  deleteNotification,
  getDeceasedPerson,
  getNotifications,
  markAllNotificationsRead,
  setNotificationRead,
} from '../services/api';
import { formatDateTime } from '../utils/format';

const FILTERS = [
  { id: 'ALL', label: 'All', match: () => true },
  { id: 'UNREAD', label: 'Unread', match: (n) => !n.read },
  { id: 'CLAIMS', label: 'Claims', match: (n) => n.category === 'CLAIMS' },
  { id: 'DOCUMENTS', label: 'Documents', match: (n) => n.category === 'DOCUMENTS' },
  { id: 'SYSTEM', label: 'System', match: (n) => n.category === 'SYSTEM' },
];

const PRIORITY = {
  HIGH: { label: 'High priority', icon: 'alert', tone: 'warning' },
  INFO: { label: 'Information', icon: 'info', tone: 'info' },
  SUCCESS: { label: 'Success', icon: 'check', tone: 'success' },
};

const CATEGORY_LABEL = { CLAIMS: 'Claims', DOCUMENTS: 'Documents', SYSTEM: 'System' };

export default function Notifications() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, items: [], error: null });
  const [filter, setFilter] = useState('ALL');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, items: [], error: null });
    Promise.all([getDeceasedPerson(activeId), getNotifications(activeId)])
      .then(([person, items]) => !cancelled && setState({ status: 'ready', person, items, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', person: null, items: [], error }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  const { items, person } = state;
  const unreadCount = items.filter((n) => !n.read).length;
  const activeFilter = FILTERS.find((f) => f.id === filter);
  const visible = useMemo(() => items.filter(activeFilter.match), [items, activeFilter]);

  /** Applies a change locally straight away, then confirms it with the service. */
  const run = async (apply, request) => {
    setActionError(null);
    const previous = items;
    setState((prev) => ({ ...prev, items: apply(prev.items) }));
    try {
      await request();
    } catch {
      setState((prev) => ({ ...prev, items: previous }));
      setActionError('We could not update your notifications. Please try again.');
    }
  };

  const setRead = (id, read) =>
    run(
      (list) => list.map((n) => (n.id === id ? { ...n, read } : n)),
      () => setNotificationRead(id, read),
    );

  const markAllRead = () =>
    run(
      (list) => list.map((n) => ({ ...n, read: true })),
      () => markAllNotificationsRead(activeId),
    );

  const confirmDelete = () => {
    const { id } = pendingDelete;
    setPendingDelete(null);
    run(
      (list) => list.filter((n) => n.id !== id),
      () => deleteNotification(id),
    );
  };

  const open = (notification) => {
    if (!notification.read) setNotificationRead(notification.id, true).catch(() => {});
    navigate(notification.href);
  };

  return (
    <div className="stack notifications">
      <PageHeader
        title="Notifications"
        description="Stay updated on documents, claims and important activity for this case."
        actions={
          state.status === 'ready' &&
          items.length > 0 && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              <Icon name="check" size={16} /> Mark All as Read
            </button>
          )
        }
      >
        {person && (
          <div className="page-header__meta">
            <span>
              Case: <strong>{person.name}</strong> · {person.caseRef}
            </span>
            <Link className="link" to="/deceased">
              Change case
            </Link>
          </div>
        )}
      </PageHeader>

      {actionError && (
        <div className="alert alert--error" role="alert">
          <Icon name="alert" size={16} /> {actionError}
        </div>
      )}

      {state.status === 'loading' && (
        <div className="panel" aria-busy="true" aria-label="Loading notifications">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton--row" style={{ height: 64 }} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <section className="empty-state">
          <div className="empty-state__icon empty-state__icon--error">
            <Icon name="alert" size={26} />
          </div>
          <h2>We couldn&rsquo;t load your notifications</h2>
          <p>Something went wrong. Please try again.</p>
          <div className="empty-state__actions">
            <button className="btn btn--primary" onClick={load}>
              Retry
            </button>
            <Link className="btn btn--secondary" to="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </section>
      )}

      {state.status === 'ready' && items.length === 0 && (
        <section className="empty-state empty-state--wide">
          <div className="empty-state__icon">
            <Icon name="bell" size={26} />
          </div>
          <h2>No notifications</h2>
          <p>
            You&rsquo;re all caught up. Updates about this case&rsquo;s documents and claims will
            appear here.
          </p>
          <Link className="btn btn--primary" to="/dashboard">
            Back to Dashboard
          </Link>
        </section>
      )}

      {state.status === 'ready' && items.length > 0 && (
        <section className="panel">
          <div className="chip-filter" role="group" aria-label="Filter notifications">
            {FILTERS.map((option) => {
              const count = items.filter(option.match).length;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`chip${filter === option.id ? ' is-active' : ''}`}
                  aria-pressed={filter === option.id}
                  onClick={() => setFilter(option.id)}
                >
                  {option.label} <span className="chip__count">{count}</span>
                </button>
              );
            })}
          </div>

          <p className="filter-bar__count" aria-live="polite">
            {unreadCount === 0 ? 'No unread notifications' : `${unreadCount} unread`} · showing{' '}
            {visible.length} of {items.length}
          </p>

          {visible.length === 0 ? (
            <div className="no-results">
              <Icon name="bell" size={22} />
              <p className="no-results__title">
                No {activeFilter.label.toLowerCase()} notifications
              </p>
              <p>There is nothing in this view right now.</p>
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => setFilter('ALL')}>
                Show all notifications
              </button>
            </div>
          ) : (
            <ul className="notification-list">
              {visible.map((notification) => {
                const priority = PRIORITY[notification.priority] ?? PRIORITY.INFO;
                return (
                  <li
                    key={notification.id}
                    className={`notification${notification.read ? '' : ' is-unread'}`}
                  >
                    <span
                      className={`notification__icon notification__icon--${priority.tone}`}
                      aria-hidden="true"
                    >
                      <Icon name={priority.icon} size={18} />
                    </span>

                    <div className="notification__body">
                      <div className="notification__head">
                        <h3 className="notification__title">
                          {notification.href ? (
                            <button type="button" onClick={() => open(notification)}>
                              {notification.title}
                            </button>
                          ) : (
                            notification.title
                          )}
                        </h3>
                        {!notification.read && <span className="notification__unread">Unread</span>}
                        <StatusBadge status={priority.label} />
                      </div>
                      <p className="notification__description">{notification.description}</p>
                      <p className="notification__meta">
                        <time dateTime={notification.timestamp}>
                          {formatDateTime(notification.timestamp)}
                        </time>
                        <span>{CATEGORY_LABEL[notification.category]}</span>
                        {notification.relatedLabel && <span>{notification.relatedLabel}</span>}
                      </p>
                    </div>

                    <div className="notification__actions">
                      {notification.href && (
                        <button
                          type="button"
                          className="btn btn--secondary btn--sm"
                          onClick={() => open(notification)}
                          aria-label={`View: ${notification.title}`}
                        >
                          View <Icon name="chevronRight" size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setRead(notification.id, !notification.read)}
                        aria-label={`${notification.read ? 'Mark as Unread' : 'Mark as Read'}: ${notification.title}`}
                      >
                        {notification.read ? 'Mark as Unread' : 'Mark as Read'}
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--sm"
                        onClick={() => setPendingDelete(notification)}
                        aria-label={`Delete notification: ${notification.title}`}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this notification?"
        message="This is a demonstration action. The notification is only removed from this demo session."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
