import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AssetTypeBadge from '../components/ui/AssetTypeBadge';
import CategoryBadge from '../components/ui/CategoryBadge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import UploadButton from '../components/ui/UploadButton';
import { useActiveCase } from '../context/CaseContext';
import { getDocumentById, uploadDocument, verifyDocument } from '../services/api';
import { canVerify, categoryFor, hasFile, isOutstanding } from '../services/documentRules';
import { formatDateShort, formatFileSize } from '../utils/format';

export default function DocumentDetails() {
  const { id } = useParams();
  const { activeId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', document: null, error: null });
  const [uploadError, setUploadError] = useState(null);
  const [confirmVerify, setConfirmVerify] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', document: null, error: null });
    setNotice(null);
    setShowPreview(false);
    getDocumentById(id)
      .then((document) => !cancelled && setState({ status: 'ready', document, error: null }))
      .catch((error) => !cancelled && setState({ status: 'error', document: null, error }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') {
    return (
      <div className="stack" aria-busy="true" aria-label="Loading document">
        <div>
          <div className="skeleton skeleton--title" style={{ width: 260 }} />
          <div className="skeleton skeleton--line" style={{ width: 200 }} />
        </div>
        <div className="panel">
          {[0, 1, 2, 3].map((i) => (
            <div className="skeleton skeleton--row" key={i} />
          ))}
        </div>
      </div>
    );
  }

  // A document that belongs to a different case is treated like a missing one.
  const wrongCase = state.status === 'ready' && state.document.caseId !== activeId;
  const notFound = wrongCase || state.error?.code === 'NOT_FOUND';

  if (state.status === 'error' || wrongCase) {
    return (
      <section className="empty-state">
        <div className={`empty-state__icon${notFound ? '' : ' empty-state__icon--error'}`}>
          <Icon name={notFound ? 'search' : 'alert'} size={26} />
        </div>
        <h2>{notFound ? 'Document not found' : 'We couldn’t load this document'}</h2>
        <p>
          {notFound
            ? 'This document does not exist in the active case.'
            : 'Something went wrong. Please try again.'}
        </p>
        {notFound ? (
          <Link className="btn btn--primary" to="/documents">
            Back to Documents
          </Link>
        ) : (
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        )}
      </section>
    );
  }

  const doc = state.document;
  const claims = doc.relatedClaims;
  const outstanding = isOutstanding(doc);
  const category = categoryFor(doc.category);

  const handleUpload = async (file) => {
    const updated = await uploadDocument(doc.id, file);
    setState((prev) => ({ ...prev, document: updated }));
    setNotice(`Uploaded ${file.fileName} (${formatFileSize(file.size)}). Only the file name and size are recorded.`);
  };

  const handleVerify = async () => {
    setConfirmVerify(false);
    setVerifying(true);
    setActionError(null);
    try {
      const updated = await verifyDocument(doc.id);
      setState((prev) => ({ ...prev, document: updated }));
      setNotice('Marked as verified in LegacyTrack. This was a demonstration action — no external verification took place.');
    } catch (error) {
      setActionError(error?.message ?? 'We could not update this document. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="stack">
      <PageHeader backTo="/documents" backLabel="Documents" title={doc.name}>
        <div className="page-header__meta">
          <CategoryBadge category={doc.category} />
          <StatusBadge status={doc.status} />
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

      {/* Actions ----------------------------------------------------------- */}
      <section
        className={`next-step next-step--${outstanding ? 'warning' : doc.status === 'Verified' ? 'success' : 'info'}`}
        aria-label="Document actions"
      >
        <span className="next-step__icon" aria-hidden="true">
          <Icon name={outstanding ? 'upload' : 'file'} size={20} />
        </span>
        <div className="next-step__text">
          <p className="eyebrow">Status</p>
          <p className="next-step__title">
            {outstanding
              ? 'This document has not been uploaded'
              : doc.status === 'Verified'
                ? 'This document is marked as verified'
                : 'This document is uploaded and awaiting verification'}
          </p>
          <p>
            {outstanding
              ? 'PDF, JPG or PNG up to 5 MB. Uploads are simulated in this demo.'
              : doc.status === 'Verified'
                ? 'Verification here is a LegacyTrack demo status, not a check by any authority.'
                : 'You can mark it as verified for the purposes of this demo.'}
          </p>
          {uploadError && (
            <p className="form-field__error" id="document-upload-error">
              <Icon name="alert" size={13} /> {uploadError}
            </p>
          )}
        </div>
        <div className="next-step__actions">
          {outstanding && (
            <UploadButton
              id="document-upload"
              label="Upload Document"
              invalid={Boolean(uploadError)}
              describedBy={uploadError ? 'document-upload-error' : undefined}
              onFile={handleUpload}
              onError={setUploadError}
            />
          )}
          {hasFile(doc) && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              aria-expanded={showPreview}
              aria-controls="document-preview"
              onClick={() => setShowPreview((v) => !v)}
            >
              <Icon name="file" size={14} /> {showPreview ? 'Hide Document' : 'View Document'}
            </button>
          )}
          {canVerify(doc) && (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setConfirmVerify(true)}
              disabled={verifying}
            >
              <Icon name="check" size={14} /> {verifying ? 'Updating…' : 'Mark as Verified'}
            </button>
          )}
        </div>
      </section>

      {/* Demo preview ------------------------------------------------------ */}
      {showPreview && hasFile(doc) && (
        <section className="panel doc-preview" id="document-preview" aria-label="Document preview">
          <div className="doc-preview__page" aria-hidden="true">
            <Icon name="file" size={34} />
          </div>
          <div>
            <h3>{doc.fileName}</h3>
            <p className="doc-preview__meta">
              {doc.fileSize ? formatFileSize(doc.fileSize) : 'Size not recorded'} · {doc.status}
            </p>
            <p>
              Demo preview. LegacyTrack records only the file name and size in this prototype, so
              there are no document contents to display.
            </p>
          </div>
        </section>
      )}

      <div className="details-grid">
        {/* Document details ------------------------------------------------ */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Document details</h3>
              <p>{category?.description}</p>
            </div>
          </header>
          <dl className="detail-list">
            <div>
              <dt>Document name</dt>
              <dd>{doc.name}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>
                <CategoryBadge category={doc.category} />
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={doc.status} />
              </dd>
            </div>
            <div>
              <dt>Uploaded date</dt>
              <dd className={doc.uploadedDate ? '' : 'muted'}>
                {doc.uploadedDate ? formatDateShort(doc.uploadedDate) : 'Not uploaded'}
              </dd>
            </div>
            <div>
              <dt>File name</dt>
              <dd className={doc.fileName ? 'wrap' : 'muted'}>{doc.fileName ?? 'No file yet'}</dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd className={doc.fileSize ? '' : 'muted'}>
                {doc.fileSize ? formatFileSize(doc.fileSize) : '—'}
              </dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd className={doc.lastUpdated ? '' : 'muted'}>
                {doc.lastUpdated ? formatDateShort(doc.lastUpdated) : '—'}
              </dd>
            </div>
          </dl>
        </section>

        {/* Related claims and assets --------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>{doc.shared ? 'Used by' : 'Related claim and asset'}</h3>
              <p>
                {doc.shared
                  ? 'One copy for the case. Each claim below refers to this same document.'
                  : 'This document belongs to one claim.'}
              </p>
            </div>
          </header>

          {claims.length === 0 ? (
            <p className="panel__empty">
              No claim needs this document yet. It will be picked up automatically when a claim
              requires it.
            </p>
          ) : (
            <ul className="related-list">
              {claims.map((claim) => (
                <li key={claim.id}>
                  <AssetTypeBadge type={claim.assetType} />
                  <dl>
                    <div>
                      <dt>Related claim</dt>
                      <dd>
                        <Link className="link mono" to={`/claims/${claim.id}`}>
                          {claim.claimReference}
                        </Link>
                      </dd>
                    </div>
                    <div>
                      <dt>Related asset</dt>
                      <dd>
                        {claim.assetHref ? (
                          <Link className="link" to={claim.assetHref}>
                            {claim.assetLabel}
                          </Link>
                        ) : (
                          claim.assetLabel
                        )}
                        <span className="related-list__ref mono"> · {claim.assetReference}</span>
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmVerify}
        title="Mark this document as verified?"
        message="This is a demonstration action. No external verification service is being used."
        confirmLabel="Mark as Verified"
        cancelLabel="Cancel"
        onConfirm={handleVerify}
        onCancel={() => setConfirmVerify(false)}
      />
    </div>
  );
}
