import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import Toggle from '../components/ui/Toggle';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_CASE_ID, useActiveCase } from '../context/CaseContext';
import { useKyc } from '../context/KycContext';
import { getDeceasedPerson, getPreferences, resetDemoData, setPreference } from '../services/api';

const PREFERENCES = [
  {
    key: 'emailNotifications',
    label: 'Email notifications',
    description: 'A summary of new activity for your cases.',
  },
  {
    key: 'claimAlerts',
    label: 'Claim alerts',
    description: 'When a claim changes stage or needs your attention.',
  },
  {
    key: 'documentAlerts',
    label: 'Document alerts',
    description: 'When a document is required, uploaded or verified.',
  },
];

export default function Settings() {
  const { user } = useAuth();
  const { activeId, setActiveId } = useActiveCase();
  const { resetKyc } = useKyc();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, preferences: null });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, preferences: null });
    Promise.all([getDeceasedPerson(activeId), getPreferences()])
      .then(
        ([person, preferences]) => !cancelled && setState({ status: 'ready', person, preferences }),
      )
      .catch(() => !cancelled && setState({ status: 'error', person: null, preferences: null }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  const toggle = async (key, value) => {
    setError(null);
    setNotice(null);
    setState((prev) => ({ ...prev, preferences: { ...prev.preferences, [key]: value } }));
    try {
      await setPreference(key, value);
    } catch {
      setState((prev) => ({ ...prev, preferences: { ...prev.preferences, [key]: !value } }));
      setError('We could not save that preference. Please try again.');
    }
  };

  const handleReset = async () => {
    setConfirmReset(false);
    setResetting(true);
    setError(null);
    try {
      await resetDemoData();
      setActiveId(DEFAULT_CASE_ID);
      // The demo KYC is part of the demo state: clear it and start again there.
      resetKyc();
      navigate('/kyc', { replace: true, state: { reset: true } });
    } catch {
      setError('We could not reset the demo data. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  if (state.status === 'error') {
    return (
      <section className="empty-state">
        <div className="empty-state__icon empty-state__icon--error">
          <Icon name="alert" size={26} />
        </div>
        <h2>We couldn&rsquo;t load your settings</h2>
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
    );
  }

  const loading = state.status === 'loading';

  return (
    <div className="stack settings">
      <PageHeader
        title="Profile & Settings"
        description="Your account details and notification preferences."
      />

      {notice && (
        <div className="alert alert--success" role="status">
          <Icon name="check" size={18} />
          <span>{notice}</span>
          <button
            type="button"
            className="alert__dismiss"
            aria-label="Dismiss confirmation"
            onClick={() => setNotice(null)}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="alert alert--error" role="alert">
          <Icon name="alert" size={16} /> {error}
        </div>
      )}

      {/* Profile ----------------------------------------------------------- */}
      <section className="panel profile-card" aria-label="Profile">
        <span className="profile-card__avatar" aria-hidden="true">
          {user.initials}
        </span>
        <div className="profile-card__text">
          <h3>{user.name}</h3>
          <p>Legal Heir</p>
        </div>
        <span className="badge badge--neutral">
          <span className="badge__dot" aria-hidden="true" />
          Demo account
        </span>
      </section>

      <div className="settings__grid">
        {/* Account --------------------------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Account</h3>
              <p>Shown for reference in this demo</p>
            </div>
          </header>
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>Legal Heir</dd>
            </div>
            <div className="detail-list__wide">
              <dt>Email</dt>
              <dd className="wrap">{user.email}</dd>
            </div>
            <div className="detail-list__wide">
              <dt>Case</dt>
              <dd>
                {loading ? (
                  <span className="skeleton skeleton--line" style={{ display: 'block', width: 160 }} />
                ) : (
                  <>
                    <Link className="link" to={`/deceased/${state.person.id}`}>
                      {state.person.name}
                    </Link>
                    <span className="muted"> · {state.person.caseRef}</span>
                  </>
                )}
              </dd>
            </div>
          </dl>
          <p className="form-note">
            <Icon name="info" size={14} />
            Account details cannot be edited in this prototype.
          </p>
        </section>

        {/* Preferences ----------------------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Preferences</h3>
              <p>Choose what you would like to hear about</p>
            </div>
          </header>
          {loading ? (
            <div aria-busy="true" aria-label="Loading preferences">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton skeleton--row" />
              ))}
            </div>
          ) : (
            <div className="toggle-list">
              {PREFERENCES.map((preference) => (
                <Toggle
                  key={preference.key}
                  id={`pref-${preference.key}`}
                  label={preference.label}
                  description={preference.description}
                  checked={Boolean(state.preferences[preference.key])}
                  onChange={(value) => toggle(preference.key, value)}
                />
              ))}
            </div>
          )}
          <p className="form-note">
            <Icon name="info" size={14} />
            Demo preferences. LegacyTrack does not send emails or alerts in this prototype.
          </p>
        </section>
      </div>

      {/* Demo data --------------------------------------------------------- */}
      <section className="panel settings__demo" aria-label="Demo data">
        <div>
          <h3>Demo data</h3>
          <p>
            Everything in LegacyTrack is fictional sample data kept in this browser tab. Resetting
            restores the original Rajesh Kumar case, removes anything added during the demo and
            clears the demo KYC, so you will be asked to verify again.
          </p>
        </div>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => setConfirmReset(true)}
          disabled={resetting}
        >
          {resetting ? 'Resetting…' : 'Reset demo data'}
        </button>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="Cases, accounts, policies, uploads and notifications added during this demo will be removed, the original sample data restored and the demo KYC cleared."
        confirmLabel="Reset"
        cancelLabel="Cancel"
        danger
        onConfirm={handleReset}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
