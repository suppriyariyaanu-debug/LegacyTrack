import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import { getDeceasedPersons } from '../services/api';
import { formatDate, formatDateShort } from '../utils/format';

/** Register / select: every registered deceased person, with the active case marked. */
export default function DeceasedList() {
  const { activeId, setActiveId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', persons: [], error: null });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', persons: [], error: null });
    getDeceasedPersons()
      .then((persons) => !cancelled && setState({ status: 'ready', persons, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', persons: [], error }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => load(), [load]);

  const registerButton = (
    <Link className="btn btn--primary" to="/deceased/new">
      <Icon name="plus" size={16} /> Register deceased person
    </Link>
  );

  return (
    <div className="stack">
      <PageHeader
        title="Registered cases"
        description="Each deceased person you register becomes a case. The active case is the one shown on the Dashboard."
        actions={registerButton}
      />

      {state.status === 'loading' && (
        <div className="case-grid" aria-busy="true" aria-label="Loading cases">
          {[0, 1].map((i) => (
            <div className="panel" key={i}>
              <div className="skeleton skeleton--title" style={{ width: '55%' }} />
              <div className="skeleton skeleton--line" style={{ width: '40%' }} />
              <div className="skeleton skeleton--row" />
            </div>
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <section className="empty-state">
          <div className="empty-state__icon empty-state__icon--error">
            <Icon name="alert" size={26} />
          </div>
          <h2>We couldn&rsquo;t load the cases</h2>
          <p>Something went wrong. Please try again.</p>
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && state.persons.length === 0 && (
        <section className="empty-state">
          <div className="empty-state__icon">
            <Icon name="user" size={26} />
          </div>
          <h2>No one registered yet</h2>
          <p>Register a deceased person to start organising their financial assets and claims.</p>
          {registerButton}
        </section>
      )}

      {state.status === 'ready' && state.persons.length > 0 && (
        <ul className="case-grid">
          {state.persons.map((person) => {
            const isActive = person.id === activeId;
            return (
              <li className={`panel case-card${isActive ? ' is-active' : ''}`} key={person.id}>
                <div className="case-card__top">
                  <span className="person-card__avatar" aria-hidden="true">
                    {person.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div className="case-card__title">
                    <h3>{person.name}</h3>
                    <p>Case {person.caseRef}</p>
                  </div>
                  {isActive && <StatusBadge status="Active case" />}
                </div>

                <dl className="detail-list detail-list--compact">
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{formatDate(person.dateOfBirth)}</dd>
                  </div>
                  <div>
                    <dt>Date of death</dt>
                    <dd>{formatDate(person.dateOfDeath)}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>
                      {person.city}, {person.state}
                    </dd>
                  </div>
                  <div>
                    <dt>Registered</dt>
                    <dd>{formatDateShort(person.registeredOn)}</dd>
                  </div>
                </dl>

                <div className="case-card__actions">
                  <Link className="btn btn--secondary btn--sm" to={`/deceased/${person.id}`}>
                    View details
                  </Link>
                  {!isActive && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setActiveId(person.id)}
                    >
                      Set as active case
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
