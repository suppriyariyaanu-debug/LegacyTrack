import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AssetTypeBadge from '../components/ui/AssetTypeBadge';
import ClaimProgress from '../components/ui/ClaimProgress';
import ClaimTimeline from '../components/ui/ClaimTimeline';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import UploadButton from '../components/ui/UploadButton';
import { useActiveCase } from '../context/CaseContext';
import { getClaim, submitClaim, uploadClaimDocument } from '../services/api';
import {
  claimAction,
  isOutstanding,
  outstandingDocuments,
  stageLabel,
  timelineDetails,
} from '../services/claimRules';
import { formatCurrency, formatDateShort } from '../utils/format';

const ACTION_ICON = { DOCUMENTS: 'file', SUBMIT: 'upload', STATUS: 'claims', SETTLEMENT: 'wallet' };
const ACTION_TARGET = { DOCUMENTS: 'documents', STATUS: 'progress', SETTLEMENT: 'settlement' };

export default function ClaimDetails() {
  const { id } = useParams();
  const { activeId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', claim: null, error: null });
  const [uploadError, setUploadError] = useState({ documentId: null, message: null });
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', claim: null, error: null });
    setNotice(null);
    getClaim(id)
      .then((claim) => !cancelled && setState({ status: 'ready', claim, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', claim: null, error }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') return <DetailsSkeleton />;

  // A claim that belongs to a different case is treated like a missing one.
  const wrongCase = state.status === 'ready' && state.claim.caseId !== activeId;
  const notFound = wrongCase || state.error?.code === 'NOT_FOUND';

  if (state.status === 'error' || wrongCase) {
    return (
      <section className="empty-state">
        <div className={`empty-state__icon${notFound ? '' : ' empty-state__icon--error'}`}>
          <Icon name={notFound ? 'search' : 'alert'} size={26} />
        </div>
        <h2>{notFound ? 'Claim not found' : 'We couldn’t load this claim'}</h2>
        <p>
          {notFound
            ? 'This claim does not exist in the active case.'
            : 'Something went wrong. Please try again.'}
        </p>
        {notFound ? (
          <Link className="btn btn--primary" to="/claims">
            Back to Claims
          </Link>
        ) : (
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        )}
      </section>
    );
  }

  const { claim } = state;
  const { asset } = claim;
  const isBank = claim.assetType === 'BANK';
  const outstanding = outstandingDocuments(claim);
  const action = claimAction(claim);
  const timeline = timelineDetails(claim);
  const showSettlement = claim.currentStage === 'APPROVED' || claim.currentStage === 'SETTLED';

  const handleAction = () => {
    if (action.kind === 'SUBMIT') {
      setConfirmSubmit(true);
      return;
    }
    const target = document.getElementById(ACTION_TARGET[action.kind]);
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  };

  const handleSubmit = async () => {
    setConfirmSubmit(false);
    setSubmitting(true);
    setActionError(null);
    try {
      const updated = await submitClaim(claim.id);
      setState((prev) => ({ ...prev, claim: updated }));
      setNotice(
        `Claim marked as ${updated.claimStatus} in LegacyTrack. This was a demonstration action — no real claim was sent.`,
      );
    } catch (error) {
      setActionError(error?.message ?? 'We could not update this claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (documentId, file) => {
    const updated = await uploadClaimDocument(claim.id, documentId, file);
    setState((prev) => ({ ...prev, claim: updated }));
  };

  return (
    <div className="stack">
      <PageHeader backTo="/claims" backLabel="Claims" title={`Claim ${claim.claimReference}`}>
        <div className="page-header__meta">
          <AssetTypeBadge type={claim.assetType} />
          <span>
            {claim.institutionName}
            {asset ? ` · ${asset.product}` : ''}
          </span>
          <StatusBadge status={claim.claimStatus} />
        </div>
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
      {actionError && (
        <div className="alert alert--error" role="alert">
          <Icon name="alert" size={16} /> {actionError}
        </div>
      )}

      {/* Next step --------------------------------------------------------- */}
      <section className={`next-step next-step--${action.tone}`} aria-label="Next step">
        <span className="next-step__icon" aria-hidden="true">
          <Icon name={ACTION_ICON[action.kind]} size={20} />
        </span>
        <div className="next-step__text">
          <p className="eyebrow">Next step</p>
          <p className="next-step__title">{action.title}</p>
          <p>{action.message}</p>
        </div>
        <button
          type="button"
          className={`btn ${action.kind === 'SUBMIT' ? 'btn--primary' : 'btn--secondary'}`}
          onClick={handleAction}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : action.label}
        </button>
      </section>

      {/* Headline figures -------------------------------------------------- */}
      <section className="case-strip" aria-label="Claim at a glance">
        <div>
          <p className="eyebrow">Claim amount</p>
          <p className="case-strip__value">{formatCurrency(claim.claimAmount)}</p>
        </div>
        <div>
          <p className="eyebrow">Claim status</p>
          <p className="case-strip__value">
            <StatusBadge status={claim.claimStatus} />
          </p>
        </div>
        <div>
          <p className="eyebrow">Current stage</p>
          <p className="case-strip__value">{stageLabel(claim)}</p>
        </div>
        <div>
          <p className="eyebrow">Documents outstanding</p>
          <p className="case-strip__value">
            {outstanding.length} of {claim.documents.length}
          </p>
        </div>
      </section>

      <div className="details-grid">
        <div className="stack">
          {/* Claim summary ------------------------------------------------ */}
          <section className="panel">
            <header className="panel__header">
              <div>
                <h3>Claim summary</h3>
                <p>The record LegacyTrack keeps for this claim</p>
              </div>
            </header>
            <dl className="detail-list">
              <div>
                <dt>Claim reference</dt>
                <dd className="mono">{claim.claimReference}</dd>
              </div>
              <div>
                <dt>Asset type</dt>
                <dd>
                  <AssetTypeBadge type={claim.assetType} />
                </dd>
              </div>
              <div>
                <dt>Institution</dt>
                <dd>{claim.institutionName}</dd>
              </div>
              <div>
                <dt>Asset reference</dt>
                <dd className="mono">{claim.assetReference}</dd>
              </div>
              <div>
                <dt>Claim amount</dt>
                <dd>{formatCurrency(claim.claimAmount)}</dd>
              </div>
              <div>
                <dt>Claim status</dt>
                <dd>
                  <StatusBadge status={claim.claimStatus} />
                </dd>
              </div>
              <div>
                <dt>Created date</dt>
                <dd>{formatDateShort(claim.createdDate)}</dd>
              </div>
              <div>
                <dt>Submitted date</dt>
                <dd className={claim.submittedDate ? '' : 'muted'}>
                  {claim.submittedDate ? formatDateShort(claim.submittedDate) : 'Not yet submitted'}
                </dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDateShort(claim.lastUpdated)}</dd>
              </div>
            </dl>
          </section>

          {/* Asset information -------------------------------------------- */}
          <section className="panel">
            <header className="panel__header">
              <div>
                <h3>Asset information</h3>
                <p>{isBank ? 'The bank account this claim is for' : 'The insurance policy this claim is for'}</p>
              </div>
              {asset && (
                <Link className="btn btn--secondary btn--sm" to={asset.href}>
                  {isBank ? 'View Bank Account' : 'View Insurance Policy'}
                </Link>
              )}
            </header>
            <dl className="detail-list">
              <div>
                <dt>{isBank ? 'Bank name' : 'Insurance company'}</dt>
                <dd>{claim.institutionName}</dd>
              </div>
              <div>
                <dt>{isBank ? 'Account type' : 'Policy type'}</dt>
                <dd>{asset?.product ?? '—'}</dd>
              </div>
              <div>
                <dt>{isBank ? 'Masked account number' : 'Masked policy number'}</dt>
                <dd className="mono">{asset?.maskedNumber ?? '—'}</dd>
              </div>
              <div>
                <dt>Asset status</dt>
                <dd>{asset ? <StatusBadge status={asset.assetStatus} /> : '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Settlement details ------------------------------------------- */}
          {showSettlement && (
            <section className="panel anchor-target" id="settlement" tabIndex={-1}>
              <header className="panel__header">
                <div>
                  <h3>Settlement details</h3>
                  <p>As recorded for this case</p>
                </div>
              </header>
              <dl className="detail-list">
                <div>
                  <dt>Settlement status</dt>
                  <dd>
                    <StatusBadge status={claim.claimStatus} />
                  </dd>
                </div>
                <div>
                  <dt>Approved amount</dt>
                  <dd>{formatCurrency(claim.claimAmount)}</dd>
                </div>
                <div>
                  <dt>Settlement date</dt>
                  <dd className={claim.settledDate ? '' : 'muted'}>
                    {claim.settledDate ? formatDateShort(claim.settledDate) : 'Awaiting settlement'}
                  </dd>
                </div>
              </dl>
              <p className="form-note">
                <Icon name="info" size={14} />
                Demo data. LegacyTrack does not receive settlement information from any bank or
                insurer.
              </p>
            </section>
          )}
        </div>

        {/* Claim progress -------------------------------------------------- */}
        <section className="panel anchor-target" id="progress" tabIndex={-1}>
          <header className="panel__header">
            <div>
              <h3>Claim progress</h3>
              <p>Six stages from identification to settlement</p>
            </div>
          </header>
          <div className="timeline-summary">
            <ClaimProgress stage={claim.currentStage} />
          </div>
          <ClaimTimeline stage={claim.currentStage} dates={timeline.dates} notes={timeline.notes} />
        </section>
      </div>

      {/* Required documents ------------------------------------------------ */}
      <section className="panel anchor-target" id="documents" tabIndex={-1}>
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
              {claim.documents.map((doc) => {
                const needsUpload = isOutstanding(doc);
                const error = uploadError.documentId === doc.id ? uploadError.message : null;
                return (
                  <tr key={doc.id}>
                    <td data-label="Document">
                      <p className="doc-name">
                        <span className={`doc-name__mark${needsUpload ? '' : ' is-done'}`} aria-hidden="true">
                          <Icon name={needsUpload ? 'circle' : 'check'} size={18} />
                        </span>
                        <span>
                          <Link className="table__primary table__link" to={`/documents/${doc.id}`}>
                            {doc.name}
                          </Link>
                          {doc.shared && (
                            <span className="table__secondary doc-name__note">
                              Case document · shared across claims
                            </span>
                          )}
                        </span>
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
                            label="Upload Document"
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

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit this claim?"
        message={`This is a demonstration action. No real claim will be submitted. LegacyTrack will only mark claim ${claim.claimReference} as submitted in this demo.`}
        confirmLabel="Submit Claim"
        cancelLabel="Cancel"
        onConfirm={handleSubmit}
        onCancel={() => setConfirmSubmit(false)}
      />
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading claim">
      <div>
        <div className="skeleton skeleton--title" style={{ width: 260 }} />
        <div className="skeleton skeleton--line" style={{ width: 200 }} />
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
