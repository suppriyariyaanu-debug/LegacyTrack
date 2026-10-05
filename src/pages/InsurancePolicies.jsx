import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatCard, { StatCardSkeleton } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import { POLICY_TYPES, ASSET_STATUSES, INSURANCE_CLAIM_STATUSES } from '../data/constants';
import { getInsurancePolicies, getDeceasedPerson } from '../services/api';
import { formatCurrency, formatDateShort } from '../utils/format';

const NO_FILTERS = { query: '', policyType: '', assetStatus: '', claimStatus: '' };
const isOutstanding = (doc) => doc.status === 'Required' || doc.status === 'Pending';
/** Lower-cases and drops spaces so "ast ins 0001" style input still matches. */
const normalise = (text) => text.toLowerCase().replace(/\s+/g, '');

export default function InsurancePolicies() {
  const { activeId } = useActiveCase();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, policies: [], error: null });
  const [filters, setFilters] = useState(NO_FILTERS);
  // Success confirmation handed over by the Add Insurance Policy form.
  const [notice, setNotice] = useState(location.state?.added ?? null);

  useEffect(() => {
    // Clear the router state so the confirmation does not reappear on refresh.
    if (location.state?.added) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, policies: [], error: null });
    Promise.all([getDeceasedPerson(activeId), getInsurancePolicies(activeId)])
      .then(
        ([person, policies]) =>
          !cancelled && setState({ status: 'ready', person, policies, error: null }),
      )
      .catch(
        (error) => !cancelled && setState({ status: 'error', person: null, policies: [], error }),
      );
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  const { policies, person } = state;

  const summary = useMemo(
    () => ({
      count: policies.length,
      value: policies.reduce((sum, a) => sum + a.claimAmount, 0),
      pending: policies.filter((a) => a.claimStage !== 'SETTLED').length,
      documents: policies.reduce((sum, a) => sum + a.documents.filter(isOutstanding).length, 0),
    }),
    [policies],
  );

  const filtered = useMemo(() => {
    const query = normalise(filters.query.trim());
    return policies.filter((a) => {
      const haystack = [a.insuranceCompany, a.policyType, a.maskedPolicyNumber, a.assetReference, a.claimReference]
        .filter(Boolean)
        .map(normalise);
      return (
        (!query || haystack.some((value) => value.includes(query))) &&
        (!filters.policyType || a.policyType === filters.policyType) &&
        (!filters.assetStatus || a.assetStatus === filters.assetStatus) &&
        (!filters.claimStatus || a.claimStatus === filters.claimStatus)
      );
    });
  }, [policies, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name) => (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value }));
  const clearFilters = () => setFilters(NO_FILTERS);

  const addButton = (
    <Link className="btn btn--primary" to="/insurance/new">
      <Icon name="plus" size={16} /> Add Insurance Policy
    </Link>
  );

  return (
    <div className="stack">
      <PageHeader
        title="Insurance Policies"
        description="Track identified insurance policies, claims and settlement progress for this case."
        actions={state.status === 'ready' && addButton}
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

      {notice && (
        <div className="alert alert--success" role="status">
          <Icon name="check" size={18} />
          <span>
            <strong>{notice}</strong> was added to this case.
          </span>
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

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading insurance policies" className="stack">
          <div className="summary-grid">
            {[0, 1, 2, 3].map((i) => (
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
          <h2>We couldn&rsquo;t load the insurance policies</h2>
          <p>Something went wrong. Please try again.</p>
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && policies.length === 0 && (
        <section className="empty-state empty-state--wide">
          <div className="empty-state__icon">
            <Icon name="shield" size={26} />
          </div>
          <h2>No insurance policies added yet</h2>
          <p>
            Add identified insurance policies to begin tracking claims and settlement progress for
            this case.
          </p>
          {addButton}
        </section>
      )}

      {state.status === 'ready' && policies.length > 0 && (
        <>
          <section className="summary-grid" aria-label="Insurance policy summary">
            <StatCard icon="shield" label="Total Policies" value={summary.count} hint="On record for this case" />
            <StatCard
              icon="wallet"
              label="Total Claim Value"
              value={formatCurrency(summary.value)}
              hint="Based on amounts you entered"
            />
            <StatCard
              icon="clock"
              tone="info"
              label="Claims Pending"
              value={summary.pending}
              hint={`${summary.count - summary.pending} settled`}
            />
            <StatCard
              icon="file"
              tone="warning"
              label="Documents Required"
              value={summary.documents}
              hint="Across all insurance claims"
            />
          </section>

          <section className="panel">
            <div className="filter-bar" role="search" aria-label="Search and filter insurance policies">
              <label className="filter-bar__search">
                <Icon name="search" size={16} />
                <span className="sr-only">Search by insurance company, policy number or reference</span>
                <input
                  type="search"
                  placeholder="Search company, policy number or reference"
                  value={filters.query}
                  onChange={setFilter('query')}
                />
              </label>

              <label>
                <span className="sr-only">Filter by policy type</span>
                <select className="input" value={filters.policyType} onChange={setFilter('policyType')}>
                  <option value="">All policy types</option>
                  {POLICY_TYPES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by asset status</span>
                <select className="input" value={filters.assetStatus} onChange={setFilter('assetStatus')}>
                  <option value="">All asset statuses</option>
                  {ASSET_STATUSES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by claim status</span>
                <select className="input" value={filters.claimStatus} onChange={setFilter('claimStatus')}>
                  <option value="">All claim statuses</option>
                  {INSURANCE_CLAIM_STATUSES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="btn btn--ghost btn--sm filter-bar__clear"
                onClick={clearFilters}
                disabled={!hasFilters}
              >
                Clear filters
              </button>
            </div>

            <p className="filter-bar__count" aria-live="polite">
              Showing {filtered.length} of {policies.length} {policies.length === 1 ? 'policy' : 'policies'}
            </p>

            {filtered.length === 0 ? (
              <div className="no-results">
                <Icon name="search" size={22} />
                <p className="no-results__title">No policies match your search or filters</p>
                <p>Try a different search term or clear the filters.</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table table--stack-lg">
                  <thead>
                    <tr>
                      <th scope="col">Insurance Company</th>
                      <th scope="col">Policy Type</th>
                      <th scope="col">Masked Policy Number</th>
                      <th scope="col" className="num">
                        Claim Amount
                      </th>
                      <th scope="col">Asset Status</th>
                      <th scope="col">Claim Status</th>
                      <th scope="col">Last Updated</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((policy) => (
                      <tr
                        key={policy.id}
                        className="table__row--link"
                        onClick={() => navigate(`/insurance/${policy.id}`)}
                      >
                        <td data-label="Insurance Company">
                          <Link
                            className="table__primary table__link"
                            to={`/insurance/${policy.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {policy.insuranceCompany}
                          </Link>
                          <p className="table__secondary">{policy.assetReference}</p>
                        </td>
                        <td data-label="Policy Type">{policy.policyType}</td>
                        <td data-label="Policy Number" className="mono nowrap">
                          {policy.maskedPolicyNumber}
                        </td>
                        <td data-label="Claim Amount" className="num">
                          {formatCurrency(policy.claimAmount)}
                        </td>
                        <td data-label="Asset Status">
                          <StatusBadge status={policy.assetStatus} />
                        </td>
                        <td data-label="Claim Status">
                          <StatusBadge status={policy.claimStatus} />
                        </td>
                        <td data-label="Last Updated" className="nowrap">
                          {formatDateShort(policy.lastUpdated)}
                        </td>
                        <td data-label="Actions" className="table__action">
                          <Link
                            className="btn btn--secondary btn--sm"
                            to={`/insurance/${policy.id}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`View ${policy.insuranceCompany} ${policy.policyType}`}
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
