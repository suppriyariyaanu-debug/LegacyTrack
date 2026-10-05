import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClaimsOverview from '../components/dashboard/ClaimsOverview';
import DocumentsOverview from '../components/dashboard/DocumentsOverview';
import ClaimProgress from '../components/ui/ClaimProgress';
import Icon from '../components/ui/Icon';
import StatCard, { StatCardSkeleton } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import { getDashboard } from '../services/api';
import { formatCurrency, formatDate, formatDateShort, yearsBetween } from '../utils/format';

const QUICK_ACTIONS = [
  { to: '/bank-accounts', label: 'View Bank Accounts', icon: 'bank' },
  { to: '/insurance', label: 'View Insurance', icon: 'shield' },
  { to: '/claims', label: 'View Claims', icon: 'claims' },
  { to: '/documents', label: 'View Documents', icon: 'file' },
];

const ACTIVITY_ICON = {
  alert: { icon: 'alert', tone: 'warning' },
  progress: { icon: 'arrow', tone: 'info' },
  upload: { icon: 'upload', tone: 'brand' },
  verified: { icon: 'check', tone: 'success' },
};

export default function Dashboard() {
  const { activeId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    getDashboard(activeId)
      .then((data) => !cancelled && setState({ status: 'ready', data, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', data: null, error }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  if (state.status === 'error') {
    return (
      <section className="empty-state">
        <div className="empty-state__icon empty-state__icon--error">
          <Icon name="alert" size={26} />
        </div>
        <h2>We couldn&rsquo;t load the dashboard</h2>
        <p>{state.error?.message ?? 'Something went wrong.'} Please try again.</p>
        <div className="empty-state__actions">
          <button className="btn btn--primary" onClick={load}>
            Retry
          </button>
          <Link className="btn btn--secondary" to="/deceased">
            Choose a case
          </Link>
        </div>
      </section>
    );
  }

  if (state.status === 'loading') return <DashboardSkeleton />;

  const {
    person,
    summary,
    assets,
    claims,
    activity,
    documentSummary,
    outstandingDocuments: outstanding,
  } = state.data;
  const bank = assets.filter((a) => a.type === 'BANK');
  const insurance = assets.filter((a) => a.type === 'INSURANCE');

  return (
    <div className="dashboard">
      {/* Deceased person ------------------------------------------------ */}
      <section className="person-card" aria-label="Deceased person">
        <div className="person-card__main">
          <span className="person-card__avatar" aria-hidden="true">
            {person.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div>
            <p className="eyebrow">Deceased person</p>
            <h2>{person.name}</h2>
            <p className="person-card__ref">
              Case {person.caseRef} · Registered {formatDateShort(person.registeredOn)}
            </p>
          </div>
        </div>
        <dl className="person-card__facts">
          <div>
            <dt>Date of birth</dt>
            <dd>{formatDate(person.dateOfBirth)}</dd>
          </div>
          <div>
            <dt>Date of death</dt>
            <dd>{formatDate(person.dateOfDeath)}</dd>
          </div>
          <div>
            <dt>Age</dt>
            <dd>{yearsBetween(person.dateOfBirth, person.dateOfDeath)} years</dd>
          </div>
        </dl>
        <Link className="btn btn--secondary" to={`/deceased/${person.id}`}>
          View details <Icon name="arrow" size={16} />
        </Link>
      </section>

      {/* Quick actions ------------------------------------------------- */}
      <nav className="quick-actions" aria-label="Quick actions">
        <span className="quick-actions__label">Quick actions</span>
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} className="btn btn--secondary btn--sm" to={action.to}>
            <Icon name={action.icon} size={14} /> {action.label}
          </Link>
        ))}
      </nav>

      {/* Summary cards -------------------------------------------------- */}
      <section className="stat-grid" aria-label="Summary">
        <StatCard
          icon="wallet"
          label="Total Financial Assets"
          value={formatCurrency(summary.totalValue)}
          hint={`Estimated across ${assets.length} assets`}
        />
        <StatCard
          icon="bank"
          label="Bank Accounts"
          value={summary.bankCount}
          hint={`${formatCurrency(summary.bankValue)} estimated`}
        />
        <StatCard
          icon="shield"
          label="Insurance Policies"
          value={summary.insuranceCount}
          hint={`${formatCurrency(summary.insuranceValue)} claim value`}
        />
        <StatCard
          icon="clock"
          tone="info"
          label="Pending Claims"
          value={summary.pendingClaims}
          hint={`${summary.pendingBankClaims} bank · ${summary.pendingInsuranceClaims} insurance`}
        />
        <StatCard
          icon="check"
          tone="success"
          label="Completed Claims"
          value={summary.completedClaims}
          hint="Amount settled"
        />
        <StatCard
          icon="file"
          tone="warning"
          label="Documents Required"
          value={summary.documentsRequired}
          hint={`${summary.caseDocumentsRequired} case · ${summary.bankDocumentsRequired} bank · ${summary.insuranceDocumentsRequired} insurance`}
        />
      </section>

      {/* Claims overview ------------------------------------------------- */}
      <ClaimsOverview claims={claims} />

      <div className="dashboard__columns">
        {/* Assets -------------------------------------------------------- */}
        <section className="panel dashboard__assets">
          <header className="panel__header">
            <div>
              <h3>Financial assets</h3>
              <p>Bank accounts and insurance policies on record</p>
            </div>
          </header>

          <AssetGroup title="Bank accounts" icon="bank" items={bank} linkTo="/bank-accounts" />
          <AssetGroup
            title="Insurance policies"
            icon="shield"
            items={insurance}
            linkTo="/insurance"
          />
        </section>

        <div className="dashboard__side">
          {/* Documents overview ----------------------------------------- */}
          <DocumentsOverview summary={documentSummary} outstanding={outstanding} />

          {/* Recent activity -------------------------------------------- */}
          <section className="panel">
            <header className="panel__header">
              <div>
                <h3>Recent activity</h3>
                <p>Latest updates on this case</p>
              </div>
            </header>
            {activity.length === 0 ? (
              <p className="panel__empty">No activity yet.</p>
            ) : (
              <ol className="activity">
                {activity.map((item) => {
                  const meta = ACTIVITY_ICON[item.kind] ?? ACTIVITY_ICON.progress;
                  return (
                    <li key={item.id}>
                      <span className={`activity__icon activity__icon--${meta.tone}`}>
                        <Icon name={meta.icon} size={14} />
                      </span>
                      <div>
                        <p className="activity__title">{item.title}</p>
                        <time dateTime={item.date}>{formatDateShort(item.date)}</time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function AssetGroup({ title, icon, items, linkTo }) {
  return (
    <div className="asset-group">
      <div className="asset-group__header">
        <h4>
          <Icon name={icon} size={16} /> {title}
          <span className="count">{items.length}</span>
        </h4>
        <Link className="link" to={linkTo}>
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="panel__empty">Nothing recorded yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Asset</th>
                <th scope="col" className="num">
                  Amount
                </th>
                <th scope="col">Status</th>
                <th scope="col">Claim progress</th>
              </tr>
            </thead>
            <tbody>
              {items.map((asset) => (
                <tr key={asset.id}>
                  <td data-label="Asset">
                    <p className="table__primary">
                      {asset.href ? (
                        <Link className="table__link" to={asset.href}>
                          {asset.institution} {asset.product}
                        </Link>
                      ) : (
                        `${asset.institution} ${asset.product}`
                      )}
                    </p>
                    <p className="table__secondary">{asset.maskedNumber}</p>
                  </td>
                  <td data-label="Amount" className="num">
                    {formatCurrency(asset.amount)}
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={asset.status} />
                  </td>
                  <td data-label="Claim progress">
                    <ClaimProgress stage={asset.stage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard" aria-busy="true" aria-label="Loading dashboard">
      <div className="panel">
        <div className="skeleton skeleton--title" style={{ width: 220 }} />
        <div className="skeleton skeleton--line" style={{ width: 320, maxWidth: '100%' }} />
      </div>
      <div className="stat-grid">
        {Array.from({ length: 6 }, (_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div className="panel">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton skeleton--row" />
        ))}
      </div>
    </div>
  );
}
