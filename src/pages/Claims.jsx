import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AssetTypeBadge from '../components/ui/AssetTypeBadge';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatCard, { StatCardSkeleton } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import { CLAIM_STAGES } from '../data/mockData';
import { getClaims, getDeceasedPerson } from '../services/api';
import { ASSET_TYPE_LABELS, stageLabel, summariseClaims } from '../services/claimRules';
import { formatCurrency, formatDateShort } from '../utils/format';

const NO_FILTERS = { query: '', assetType: '', claimStatus: '', stage: '' };
/** Every claim status either asset type can have, in lifecycle order. */
const ALL_CLAIM_STATUSES = [
  'Pending',
  'Claim Submitted',
  'Claim Initiated',
  'Verification in Progress',
  'Approved',
  'Settlement Completed',
];
const normalise = (text) => text.toLowerCase().replace(/\s+/g, '');

export default function Claims() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, claims: [], error: null });
  const [filters, setFilters] = useState(NO_FILTERS);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, claims: [], error: null });
    Promise.all([getDeceasedPerson(activeId), getClaims(activeId)])
      .then(
        ([person, claims]) => !cancelled && setState({ status: 'ready', person, claims, error: null }),
      )
      .catch((error) => !cancelled && setState({ status: 'error', person: null, claims: [], error }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  const { claims, person } = state;
  const summary = useMemo(() => summariseClaims(claims), [claims]);

  const filtered = useMemo(() => {
    const query = normalise(filters.query.trim());
    return claims.filter((claim) => {
      const haystack = [
        claim.claimReference,
        claim.institutionName,
        claim.assetReference,
        claim.asset?.maskedNumber,
        claim.asset?.product,
      ]
        .filter(Boolean)
        .map(normalise);
      return (
        (!query || haystack.some((value) => value.includes(query))) &&
        (!filters.assetType || claim.assetType === filters.assetType) &&
        (!filters.claimStatus || claim.claimStatus === filters.claimStatus) &&
        (!filters.stage || claim.currentStage === filters.stage)
      );
    });
  }, [claims, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name) => (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value }));
  const clearFilters = () => setFilters(NO_FILTERS);

  return (
    <div className="stack">
      <PageHeader
        title="Claims"
        description="Track and manage all financial asset claims for this case."
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

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading claims" className="stack">
          <div className="stat-grid">
            {Array.from({ length: 6 }, (_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="panel">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton skeleton--row" />
            ))}
          </div>
        </div>
      )}

      {state.status === 'error' && (
        <section className="empty-state">
          <div className="empty-state__icon empty-state__icon--error">
            <Icon name="alert" size={26} />
          </div>
          <h2>We couldn&rsquo;t load the claims</h2>
          <p>Something went wrong. Please try again.</p>
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && claims.length === 0 && (
        <section className="empty-state empty-state--wide">
          <div className="empty-state__icon">
            <Icon name="claims" size={26} />
          </div>
          <h2>No claims yet</h2>
          <p>Claims will appear here once financial assets are identified and added to this case.</p>
          <Link className="btn btn--primary" to="/bank-accounts">
            View Financial Assets
          </Link>
        </section>
      )}

      {state.status === 'ready' && claims.length > 0 && (
        <>
          <section className="stat-grid" aria-label="Claims summary">
            <StatCard
              icon="claims"
              label="Total Claims"
              value={summary.total}
              hint={`${formatCurrency(summary.totalAmount)} in all`}
            />
            <StatCard icon="clock" tone="info" label="Pending" value={summary.pending} hint="Not yet settled" />
            <StatCard
              icon="search"
              tone="info"
              label="In Verification"
              value={summary.inVerification}
              hint="Being reviewed"
            />
            <StatCard
              icon="check"
              tone="success"
              label="Approved"
              value={summary.approved}
              hint="Awaiting settlement"
            />
            <StatCard
              icon="wallet"
              tone="success"
              label="Settlement Completed"
              value={summary.settled}
              hint="Amount settled"
            />
            <StatCard
              icon="file"
              tone="warning"
              label="Documents Required"
              value={summary.documentsRequired}
              hint={`Across ${summary.claimsNeedingDocuments} ${summary.claimsNeedingDocuments === 1 ? 'claim' : 'claims'}`}
            />
          </section>

          <section className="panel">
            <div className="filter-bar" role="search" aria-label="Search and filter claims">
              <label className="filter-bar__search">
                <Icon name="search" size={16} />
                <span className="sr-only">
                  Search by claim reference, institution, asset reference or account / policy number
                </span>
                <input
                  type="search"
                  placeholder="Search claim, institution or reference"
                  value={filters.query}
                  onChange={setFilter('query')}
                />
              </label>

              <label>
                <span className="sr-only">Filter by asset type</span>
                <select className="input" value={filters.assetType} onChange={setFilter('assetType')}>
                  <option value="">All asset types</option>
                  {Object.entries(ASSET_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by claim status</span>
                <select className="input" value={filters.claimStatus} onChange={setFilter('claimStatus')}>
                  <option value="">All claim statuses</option>
                  {ALL_CLAIM_STATUSES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by current stage</span>
                <select className="input" value={filters.stage} onChange={setFilter('stage')}>
                  <option value="">All stages</option>
                  {CLAIM_STAGES.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn--ghost btn--sm filter-bar__clear"
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear Filters
              </button>
            </div>

            <p className="filter-bar__count" aria-live="polite">
              Showing {filtered.length} of {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
            </p>

            {filtered.length === 0 ? (
              <div className="no-results">
                <Icon name="search" size={22} />
                <p className="no-results__title">No claims match your search or filters</p>
                <p>Try a different search term or clear the filters.</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table--stack-lg table--dense">
                  <thead>
                    <tr>
                      <th scope="col">Claim Reference</th>
                      <th scope="col">Asset Type</th>
                      <th scope="col">Institution</th>
                      <th scope="col">Asset / Policy Reference</th>
                      <th scope="col" className="num">
                        Claim Amount
                      </th>
                      <th scope="col">Claim Status</th>
                      <th scope="col">Current Stage</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((claim) => (
                      <tr
                        key={claim.id}
                        className="table__row--link"
                        onClick={() => navigate(`/claims/${claim.id}`)}
                      >
                        <td data-label="Claim Reference">
                          <Link
                            className="table__primary table__link mono nowrap"
                            to={`/claims/${claim.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {claim.claimReference}
                          </Link>
                        </td>
                        <td data-label="Asset Type">
                          <AssetTypeBadge type={claim.assetType} />
                        </td>
                        <td data-label="Institution">
                          <div>
                            <p className="table__primary">{claim.institutionName}</p>
                            {claim.asset && <p className="table__secondary">{claim.asset.product}</p>}
                          </div>
                        </td>
                        <td data-label="Asset / Policy Ref.">
                          <div>
                            <p className="mono nowrap">{claim.assetReference}</p>
                            {claim.asset && (
                              <p className="table__secondary">{claim.asset.maskedNumber}</p>
                            )}
                          </div>
                        </td>
                        <td data-label="Claim Amount" className="num">
                          {formatCurrency(claim.claimAmount)}
                        </td>
                        <td data-label="Claim Status">
                          <StatusBadge status={claim.claimStatus} />
                        </td>
                        <td data-label="Current Stage">{stageLabel(claim)}</td>
                        <td data-label="Last Updated" className="nowrap">
                          {formatDateShort(claim.lastUpdated)}
                        </td>
                        <td data-label="Actions" className="table__action">
                          <Link
                            className="btn btn--secondary btn--sm"
                            to={`/claims/${claim.id}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`View claim ${claim.claimReference}`}
                          >
                            View <Icon name="chevronRight" size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
