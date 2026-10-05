import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategoryBadge from '../components/ui/CategoryBadge';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatCard, { StatCardSkeleton } from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import UploadButton from '../components/ui/UploadButton';
import { useActiveCase } from '../context/CaseContext';
import { getDeceasedPerson, getDocuments, uploadDocument } from '../services/api';
import { ASSET_TYPE_LABELS } from '../services/claimRules';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  isOutstanding,
  relatesToAssetType,
  summariseDocuments,
} from '../services/documentRules';
import { formatDateShort, formatFileSize } from '../utils/format';

const NO_FILTERS = { query: '', category: '', status: '', assetType: '' };
const normalise = (text) => text.toLowerCase().replace(/\s+/g, '');

/** Where a category's documents come from, shown when the category is empty. */
const CATEGORY_EMPTY = {
  CASE: { text: 'No case documents are recorded for this case.', to: '/deceased', link: 'View case' },
  BANK_CLAIM: {
    text: 'No bank claim documents yet. They appear when a bank account is added to this case.',
    to: '/bank-accounts',
    link: 'View Bank Accounts',
  },
  INSURANCE_CLAIM: {
    text: 'No insurance claim documents yet. They appear when an insurance policy is added to this case.',
    to: '/insurance',
    link: 'View Insurance Policies',
  },
};

export default function Documents() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading', person: null, documents: [], error: null });
  const [filters, setFilters] = useState(NO_FILTERS);
  const [uploadError, setUploadError] = useState({ documentId: null, message: null });
  const [notice, setNotice] = useState(null);

  const fetchAll = useCallback(
    () => Promise.all([getDeceasedPerson(activeId), getDocuments(activeId)]),
    [activeId],
  );

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, documents: [], error: null });
    setNotice(null);
    fetchAll()
      .then(
        ([person, documents]) =>
          !cancelled && setState({ status: 'ready', person, documents, error: null }),
      )
      .catch(
        (error) => !cancelled && setState({ status: 'error', person: null, documents: [], error }),
      );
    return () => {
      cancelled = true;
    };
  }, [fetchAll]);

  useEffect(() => load(), [load]);

  const { documents, person } = state;
  const summary = useMemo(() => summariseDocuments(documents), [documents]);

  const filtered = useMemo(() => {
    const query = normalise(filters.query.trim());
    return documents.filter((doc) => {
      const haystack = [
        doc.name,
        doc.fileName,
        ...doc.relatedClaims.flatMap((c) => [c.institutionName, c.claimReference, c.assetReference, c.assetLabel]),
      ]
        .filter(Boolean)
        .map(normalise);
      return (
        (!query || haystack.some((value) => value.includes(query))) &&
        (!filters.category || doc.category === filters.category) &&
        (!filters.status || doc.status === filters.status) &&
        (!filters.assetType || relatesToAssetType(doc, filters.assetType))
      );
    });
  }, [documents, filters]);

  const hasFilters = Object.values(filters).some(Boolean);
  const setFilter = (name) => (e) => setFilters((prev) => ({ ...prev, [name]: e.target.value }));
  const clearFilters = () => setFilters(NO_FILTERS);

  /** Upload, then quietly re-read the list: one upload can move several claims on. */
  const handleUpload = async (doc, file) => {
    const updated = await uploadDocument(doc.id, file);
    const [, refreshed] = await fetchAll();
    setState((prev) => ({ ...prev, documents: refreshed }));
    setNotice(`${updated.name} uploaded: ${file.fileName} (${formatFileSize(file.size)}).`);
  };

  return (
    <div className="stack">
      <PageHeader
        title="Documents"
        description="Manage documents required across this case and its financial claims."
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

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading documents" className="stack">
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
          <h2>We couldn&rsquo;t load the documents</h2>
          <p>Something went wrong. Please try again.</p>
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        </section>
      )}

      {state.status === 'ready' && documents.length === 0 && (
        <section className="empty-state empty-state--wide">
          <div className="empty-state__icon">
            <Icon name="file" size={26} />
          </div>
          <h2>No documents yet</h2>
          <p>Documents uploaded for this case and its claims will appear here.</p>
          <div className="empty-state__actions">
            <Link className="btn btn--primary" to={`/deceased/${activeId}`}>
              <Icon name="upload" size={16} /> Upload Document
            </Link>
            <Link className="btn btn--secondary" to="/bank-accounts">
              View Financial Assets
            </Link>
          </div>
        </section>
      )}

      {state.status === 'ready' && documents.length > 0 && (
        <>
          <section className="summary-grid" aria-label="Document summary">
            <StatCard
              icon="file"
              label="Total Documents"
              value={summary.total}
              hint="For this case and its claims"
            />
            <StatCard
              icon="upload"
              tone="info"
              label="Uploaded"
              value={summary.uploaded}
              hint="Awaiting verification"
            />
            <StatCard
              icon="alert"
              tone="warning"
              label="Required"
              value={summary.required}
              hint={summary.pending > 0 ? `Including ${summary.pending} pending` : 'Not yet uploaded'}
            />
            <StatCard
              icon="check"
              tone="success"
              label="Verified"
              value={summary.verified}
              hint="Marked as verified"
            />
          </section>

          <section className="panel">
            <div className="filter-bar" role="search" aria-label="Search and filter documents">
              <label className="filter-bar__search">
                <Icon name="search" size={16} />
                <span className="sr-only">
                  Search by document name, bank or insurance company, claim reference or asset
                  reference
                </span>
                <input
                  type="search"
                  placeholder="Search document, institution or reference"
                  value={filters.query}
                  onChange={setFilter('query')}
                />
              </label>

              <label>
                <span className="sr-only">Filter by category</span>
                <select className="input" value={filters.category} onChange={setFilter('category')}>
                  <option value="">All categories</option>
                  {DOCUMENT_CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by status</span>
                <select className="input" value={filters.status} onChange={setFilter('status')}>
                  <option value="">All statuses</option>
                  {DOCUMENT_STATUSES.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
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
              Showing {filtered.length} of {documents.length}{' '}
              {documents.length === 1 ? 'document' : 'documents'}
            </p>

            {filtered.length === 0 ? (
              <div className="no-results">
                <Icon name="search" size={22} />
                <p className="no-results__title">No documents match your search or filters</p>
                <p>Try a different search term or clear the filters.</p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={clearFilters}>
                  Clear Filters
                </button>
              </div>
            ) : (
              DOCUMENT_CATEGORIES.map((category) => {
                const rows = filtered.filter((doc) => doc.category === category.id);
                // While filtering, categories with nothing to show are left out.
                if (rows.length === 0 && hasFilters) return null;
                const empty = CATEGORY_EMPTY[category.id];

                return (
                  <div className="asset-group doc-category" key={category.id} data-category={category.id}>
                    <div className="asset-group__header">
                      <h4>
                        <Icon name={category.icon} size={16} /> {category.title}
                        <span className="count">{rows.length}</span>
                      </h4>
                      <span className="doc-category__hint">{category.description}</span>
                    </div>

                    {rows.length === 0 ? (
                      <p className="panel__empty doc-category__empty">
                        {empty.text}{' '}
                        <Link className="link" to={empty.to}>
                          {empty.link}
                        </Link>
                      </p>
                    ) : (
                      <div className="table-wrap">
                        <table className="table table--stack-lg table--dense">
                          <thead>
                            <tr>
                              <th scope="col">Document</th>
                              <th scope="col">Category</th>
                              <th scope="col">Related Asset / Claim</th>
                              <th scope="col">Status</th>
                              <th scope="col">Uploaded Date</th>
                              <th scope="col">Last Updated</th>
                              <th scope="col">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((doc) => {
                              const error =
                                uploadError.documentId === doc.id ? uploadError.message : null;
                              return (
                                <tr
                                  key={doc.id}
                                  className="table__row--link"
                                  onClick={() => navigate(`/documents/${doc.id}`)}
                                >
                                  <td data-label="Document">
                                    <div className="doc-name">
                                      <span
                                        className={`doc-name__mark${isOutstanding(doc) ? '' : ' is-done'}`}
                                        aria-hidden="true"
                                      >
                                        <Icon name={isOutstanding(doc) ? 'circle' : 'check'} size={18} />
                                      </span>
                                      <div>
                                        <Link
                                          className="table__primary table__link"
                                          to={`/documents/${doc.id}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {doc.name}
                                        </Link>
                                        <p className="table__secondary wrap">
                                          {doc.fileName
                                            ? `${doc.fileName}${doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ''}`
                                            : 'No file yet'}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td data-label="Category">
                                    <CategoryBadge category={doc.category} />
                                  </td>
                                  <td data-label="Related Asset / Claim">
                                    <RelatedCell doc={doc} />
                                  </td>
                                  <td data-label="Status">
                                    <StatusBadge status={doc.status} />
                                  </td>
                                  <td
                                    data-label="Uploaded Date"
                                    className={doc.uploadedDate ? 'nowrap' : 'muted'}
                                  >
                                    {doc.uploadedDate ? formatDateShort(doc.uploadedDate) : '—'}
                                  </td>
                                  <td
                                    data-label="Last Updated"
                                    className={doc.lastUpdated ? 'nowrap' : 'muted'}
                                  >
                                    {doc.lastUpdated ? formatDateShort(doc.lastUpdated) : '—'}
                                  </td>
                                  <td
                                    data-label="Actions"
                                    className="table__action"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isOutstanding(doc) ? (
                                      <div>
                                        <UploadButton
                                          id={`upload-${doc.id}`}
                                          label="Upload Document"
                                          invalid={Boolean(error)}
                                          describedBy={error ? `upload-${doc.id}-error` : undefined}
                                          onFile={(file) => handleUpload(doc, file)}
                                          onError={(message) =>
                                            setUploadError({ documentId: doc.id, message })
                                          }
                                        />
                                        {error && (
                                          <p className="form-field__error" id={`upload-${doc.id}-error`}>
                                            {error}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <Link
                                        className="btn btn--secondary btn--sm"
                                        to={`/documents/${doc.id}`}
                                        aria-label={`View ${doc.name}`}
                                      >
                                        View <Icon name="chevronRight" size={14} />
                                      </Link>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** What a document relates to: one claim's asset, or the claims sharing a case document. */
function RelatedCell({ doc }) {
  const claims = doc.relatedClaims;

  if (doc.category !== 'CASE' && claims[0]) {
    return (
      <div>
        <p className="table__primary">{claims[0].assetLabel}</p>
        <p className="table__secondary mono">{claims[0].claimReference}</p>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div>
        <p>Whole case</p>
        <p className="table__secondary">Not needed by a claim yet</p>
      </div>
    );
  }

  return (
    <div>
      <p>
        Whole case · used by {claims.length} {claims.length === 1 ? 'claim' : 'claims'}
      </p>
      <p className="table__secondary">
        {claims.length <= 2
          ? claims.map((c) => c.claimReference).join(', ')
          : `${claims
              .slice(0, 2)
              .map((c) => c.claimReference)
              .join(', ')} +${claims.length - 2} more`}
      </p>
    </div>
  );
}
