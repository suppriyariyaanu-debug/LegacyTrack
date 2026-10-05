import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ClaimProgress from '../components/ui/ClaimProgress';
import ClaimTimeline from '../components/ui/ClaimTimeline';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import UploadButton from '../components/ui/UploadButton';
import { useActiveCase } from '../context/CaseContext';
import { CLAIM_STAGES } from '../data/mockData';
import { getBankAccount, uploadBankDocument } from '../services/api';
import { formatCurrency, formatDateShort } from '../utils/format';

const isOutstanding = (doc) => doc.status === 'Required' || doc.status === 'Pending';

export default function BankAccountDetails() {
  const { id } = useParams();
  const { activeId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', account: null, error: null });
  const [uploadError, setUploadError] = useState({ documentId: null, message: null });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', account: null, error: null });
    getBankAccount(id)
      .then((account) => !cancelled && setState({ status: 'ready', account, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', account: null, error }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') return <DetailsSkeleton />;

  // An account that belongs to a different case is treated like a missing one.
  const wrongCase = state.status === 'ready' && state.account.caseId !== activeId;
  const notFound = wrongCase || state.error?.code === 'NOT_FOUND';

  if (state.status === 'error' || wrongCase) {
    return (
      <section className="empty-state">
        <div className={`empty-state__icon${notFound ? '' : ' empty-state__icon--error'}`}>
          <Icon name={notFound ? 'search' : 'alert'} size={26} />
        </div>
        <h2>{notFound ? 'Bank account not found' : 'We couldn’t load this account'}</h2>
        <p>
          {notFound
            ? 'This bank account does not exist in the active case.'
            : 'Something went wrong. Please try again.'}
        </p>
        {notFound ? (
          <Link className="btn btn--primary" to="/bank-accounts">
            Back to Bank Accounts
          </Link>
        ) : (
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        )}
      </section>
    );
  }

  const { account } = state;
  const outstanding = account.documents.filter(isOutstanding);
  const awaitingDocuments = account.claimStage === 'DOCUMENTS' && outstanding.length > 0;
  // While documents are still being gathered, say so rather than "Documents Collected".
  const stageLabel = awaitingDocuments
    ? 'Documents Required'
    : (CLAIM_STAGES.find((s) => s.id === account.claimStage)?.label ?? '—');

  const stageNotes = {};
  if (awaitingDocuments) {
    stageNotes.DOCUMENTS = `Documents Required — ${outstanding.length} still needed before the claim can be submitted.`;
  }

  const handleUpload = async (documentId, file) => {
    const updated = await uploadBankDocument(account.id, documentId, file);
    setState((prev) => ({ ...prev, account: updated }));
  };

  return (
    <div className="stack">
      <PageHeader
        backTo="/bank-accounts"
        backLabel="Bank Accounts"
        title={`${account.bankName} · ${account.accountType}`}
      >
        <div className="page-header__meta">
          <span className="mono">{account.maskedAccountNumber}</span>
          <StatusBadge status={account.assetStatus} />
        </div>
      </PageHeader>

      {/* Headline figures ------------------------------------------------- */}
      <section className="case-strip" aria-label="Account summary">
        <div>
          <p className="eyebrow">Estimated value</p>
          <p className="case-strip__value">{formatCurrency(account.estimatedAmount)}</p>
        </div>
        <div>
          <p className="eyebrow">Claim status</p>
          <p className="case-strip__value">
            <StatusBadge status={account.claimStatus} />
          </p>
        </div>
        <div>
          <p className="eyebrow">Documents outstanding</p>
          <p className="case-strip__value">
            {outstanding.length} of {account.documents.length}
          </p>
        </div>
        <div>
          <p className="eyebrow">Last updated</p>
          <p className="case-strip__value">{formatDateShort(account.lastUpdated)}</p>
        </div>
      </section>

      <div className="details-grid">
        <div className="stack">
          {/* Account information ------------------------------------------ */}
          <section className="panel">
            <header className="panel__header">
              <div>
                <h3>Account information</h3>
                <p>As recorded for this case</p>
              </div>
            </header>
            <dl className="detail-list">
              <div>
                <dt>Bank name</dt>
                <dd>{account.bankName}</dd>
              </div>
              <div>
                <dt>Account type</dt>
                <dd>{account.accountType}</dd>
              </div>
              <div>
                <dt>Masked account number</dt>
                <dd className="mono">{account.maskedAccountNumber}</dd>
              </div>
              <div>
                <dt>Estimated balance / value</dt>
                <dd>{formatCurrency(account.estimatedAmount)}</dd>
              </div>
              <div>
                <dt>Asset reference</dt>
                <dd className="mono">{account.assetReference}</dd>
              </div>
              <div>
                <dt>Asset status</dt>
                <dd>
                  <StatusBadge status={account.assetStatus} />
                </dd>
              </div>
              <div>
                <dt>Date identified</dt>
                <dd>{formatDateShort(account.identifiedDate)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateShort(account.lastUpdated)}</dd>
              </div>
              {account.notes && (
                <div className="detail-list__wide">
                  <dt>Notes</dt>
                  <dd className="detail-list__note">{account.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Claim information -------------------------------------------- */}
          <section className="panel">
            <header className="panel__header">
              <div>
                <h3>Claim information</h3>
                <p>Where the claim for this account stands</p>
              </div>
              <Link className="btn btn--secondary btn--sm" to={`/claims/${account.claimId}`}>
                View Claim Details
              </Link>
            </header>
            <dl className="detail-list">
              <div>
                <dt>Claim status</dt>
                <dd>
                  <StatusBadge status={account.claimStatus} />
                </dd>
              </div>
              <div>
                <dt>Current stage</dt>
                <dd>{stageLabel}</dd>
              </div>
              <div>
                <dt>Claim reference</dt>
                <dd className={account.claimReference ? 'mono' : 'muted'}>
                  {account.claimReference ?? 'Not yet assigned'}
                </dd>
              </div>
              <div>
                <dt>Submitted date</dt>
                <dd className={account.submittedDate ? '' : 'muted'}>
                  {account.submittedDate ? formatDateShort(account.submittedDate) : 'Not yet submitted'}
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateShort(account.lastUpdated)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Claim progress -------------------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Claim progress</h3>
              <p>Six stages from identification to settlement</p>
            </div>
          </header>
          <div className="timeline-summary">
            <ClaimProgress stage={account.claimStage} />
          </div>
          <ClaimTimeline
            stage={account.claimStage}
            dates={{ IDENTIFIED: account.identifiedDate, SUBMITTED: account.submittedDate }}
            notes={stageNotes}
          />
        </section>
      </div>

      {/* Required documents ------------------------------------------------ */}
      <section className="panel">
        <header className="panel__header">
          <div>
            <h3>Required documents</h3>
            <p>
              {outstanding.length === 0
                ? 'All documents for this claim are in place.'
                : `${outstanding.length} still needed for this claim. Uploads are simulated in this demo.`}
            </p>
          </div>
        </header>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">File</th>
                <th scope="col">Last updated</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {account.documents.map((doc) => {
                const needsUpload = isOutstanding(doc);
                const error = uploadError.documentId === doc.id ? uploadError.message : null;
                return (
                  <tr key={doc.id}>
                    <td data-label="Document">
                      <p className="doc-name">
                        <span className={`doc-name__mark${needsUpload ? '' : ' is-done'}`} aria-hidden="true">
                          <Icon name={needsUpload ? 'circle' : 'check'} size={18} />
                        </span>
                        <span className="table__primary">{doc.name}</span>
                      </p>
                    </td>
                    <td data-label="File" className={doc.fileName ? 'wrap' : 'muted'}>
                      {doc.fileName ?? 'Not uploaded'}
                    </td>
                    <td data-label="Last updated" className={doc.updatedOn ? '' : 'muted'}>
                      {doc.updatedOn ? formatDateShort(doc.updatedOn) : '—'}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td data-label={needsUpload ? 'Action' : undefined} className="table__action">
                      {needsUpload && (
                        <div>
                          <UploadButton
                            id={`upload-${doc.id}`}
                            invalid={Boolean(error)}
                            describedBy={error ? `upload-${doc.id}-error` : undefined}
                            onFile={(file) => handleUpload(doc.id, file)}
                            onError={(message) => setUploadError({ documentId: doc.id, message })}
                          />
                          {error && (
                            <p className="form-field__error" id={`upload-${doc.id}-error`}>
                              {error}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading bank account">
      <div>
        <div className="skeleton skeleton--title" style={{ width: 260 }} />
        <div className="skeleton skeleton--line" style={{ width: 160 }} />
      </div>
      <div className="panel">
        <div className="skeleton skeleton--row" />
      </div>
      <div className="details-grid">
        {[0, 1].map((i) => (
          <div className="panel" key={i}>
            {[0, 1, 2, 3].map((j) => (
              <div className="skeleton skeleton--row" key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
