import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatCard, { StatCardSkeleton } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { useActiveCase } from '../context/CaseContext';
import { ACCOUNT_TYPES, ASSET_STATUSES, CLAIM_STATUSES } from '../data/constants';
import { getBankAccounts, getDeceasedPerson } from '../services/api';
import { formatCurrency, formatDateShort } from '../utils/format';

const NO_FILTERS = { query: '', accountType: '', assetStatus: '', claimStatus: '' };
const isOutstanding = (doc) => doc.status === 'Required' || doc.status === 'Pending';
/** Lower-cases and drops spaces so "xxxx4521" matches "XXXX XXXX 4521". */
const normalise = (text) => text.toLowerCase().replace(/\s+/g, '');

export default function BankAccounts() {
  const { activeId } = useActiveCase();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, accounts: [], error: null });
  const [filters, setFilters] = useState(NO_FILTERS);
  // Success confirmation handed over by the Add Bank Account form.
  const [notice, setNotice] = useState(location.state?.added ?? null);

  useEffect(() => {
    // Clear the router state so the confirmation does not reappear on refresh.
    if (location.state?.added) navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, accounts: [], error: null });
    Promise.all([getDeceasedPerson(activeId), getBankAccounts(activeId)])
      .then(
        ([person, accounts]) =>
          !cancelled && setState({ status: 'ready', person, accounts, error: null }),
      )
      .catch(
        (error) => !cancelled && setState({ status: 'error', person: null, accounts: [], error }),
      );
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => load(), [load]);

  const { accounts, person } = state;

  const summary = useMemo(
    () => ({
      count: accounts.length,
      value: accounts.reduce((sum, a) => sum + a.estimatedAmount, 0),
      pending: accounts.filter((a) => a.claimStage !== 'SETTLED').length,
      documents: accounts.reduce((sum, a) => sum + a.documents.filter(isOutstanding).length, 0),
    }),
    [accounts],
  );

  const filtered = useMemo(() => {
    const query = normalise(filters.query.trim());
    return accounts.filter((a) => {
      const haystack = [a.bankName, a.accountType, a.maskedAccountNumber, a.assetReference, a.claimReference]
        .filter(Boolean)
        .map(normalise);
      return (
        (!query || haystack.some((value) => value.includes(query))) &&
        (!filters.accountType || a.accountType === filters.accountType) &&
        (!filters.assetStatus || a.assetStatus === filters.assetStatus) &&
        (!filters.claimStatus || a.claimStatus === filters.claimStatus)
      );
    });
  }, [accounts, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name) => (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value }));
  const clearFilters = () => setFilters(NO_FILTERS);

  const addButton = (
    <Link className="btn btn--primary" to="/bank-accounts/new">
      <Icon name="plus" size={16} /> Add Bank Account
    </Link>
  );

  return (
    <div className="stack">
      <PageHeader
        title="Bank Accounts"
        description="Track identified bank accounts, deposits and claim progress for this case."
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
        <div aria-busy="true" aria-label="Loading bank accounts" className="stack">
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
          <h2>We couldn&rsquo;t load the bank accounts</h2>
          <p>Something went wrong. Please try again.</p>
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && accounts.length === 0 && (
        <section className="empty-state empty-state--wide">
          <div className="empty-state__icon">
            <Icon name="bank" size={26} />
          </div>
          <h2>No bank accounts added yet</h2>
          <p>
            Add identified bank accounts to begin tracking financial assets and claims for this
            case.
          </p>
          {addButton}
        </section>
      )}

      {state.status === 'ready' && accounts.length > 0 && (
        <>
          <section className="summary-grid" aria-label="Bank account summary">
            <StatCard icon="bank" label="Total Accounts" value={summary.count} hint="On record for this case" />
            <StatCard
              icon="wallet"
              label="Total Estimated Value"
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
              hint="Across all bank claims"
            />
          </section>

          <section className="panel">
            <div className="filter-bar" role="search" aria-label="Search and filter bank accounts">
              <label className="filter-bar__search">
                <Icon name="search" size={16} />
                <span className="sr-only">Search by bank name or account reference</span>
                <input
                  type="search"
                  placeholder="Search bank, account number or reference"
                  value={filters.query}
                  onChange={setFilter('query')}
                />
              </label>

              <label>
                <span className="sr-only">Filter by account type</span>
                <select className="input" value={filters.accountType} onChange={setFilter('accountType')}>
                  <option value="">All account types</option>
                  {ACCOUNT_TYPES.map((option) => (
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
                  {CLAIM_STATUSES.map((option) => (
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
              Showing {filtered.length} of {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </p>

            {filtered.length === 0 ? (
              <div className="no-results">
                <Icon name="search" size={22} />
                <p className="no-results__title">No accounts match your search or filters</p>
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
                      <th scope="col">Bank</th>
                      <th scope="col">Account Type</th>
                      <th scope="col">Masked Account Number</th>
                      <th scope="col" className="num">
                        Estimated Amount
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
                    {filtered.map((account) => (
                      <tr
                        key={account.id}
                        className="table__row--link"
                        onClick={() => navigate(`/bank-accounts/${account.id}`)}
                      >
                        <td data-label="Bank">
                          <Link
                            className="table__primary table__link"
                            to={`/bank-accounts/${account.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {account.bankName}
                          </Link>
                          <p className="table__secondary">{account.assetReference}</p>
                        </td>
                        <td data-label="Account Type">{account.accountType}</td>
                        <td data-label="Account Number" className="mono nowrap">
                          {account.maskedAccountNumber}
                        </td>
                        <td data-label="Estimated Amount" className="num">
                          {formatCurrency(account.estimatedAmount)}
                        </td>
                        <td data-label="Asset Status">
                          <StatusBadge status={account.assetStatus} />
                        </td>
                        <td data-label="Claim Status">
                          <StatusBadge status={account.claimStatus} />
                        </td>
                        <td data-label="Last Updated" className="nowrap">
                          {formatDateShort(account.lastUpdated)}
                        </td>
                        <td data-label="Actions" className="table__action">
                          <Link
                            className="btn btn--secondary btn--sm"
                            to={`/bank-accounts/${account.id}`}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`View ${account.bankName} ${account.accountType}`}
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
