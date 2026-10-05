import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import UploadButton from '../components/ui/UploadButton';
import { useActiveCase } from '../context/CaseContext';
import { getCaseDocuments, getDeceasedPerson, uploadCaseDocument } from '../services/api';
import { formatDate, formatDateShort, yearsBetween } from '../utils/format';

export default function DeceasedDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { activeId, setActiveId } = useActiveCase();
  const [state, setState] = useState({ status: 'loading', person: null, documents: [], error: null });
  const [uploadError, setUploadError] = useState({ documentId: null, message: null });

  const load = useCallback(() => {
    let cancelled = false;
    setState({ status: 'loading', person: null, documents: [], error: null });
    Promise.all([getDeceasedPerson(id), getCaseDocuments(id)])
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
  }, [id]);

  useEffect(() => load(), [load]);

  if (state.status === 'loading') return <DetailsSkeleton />;

  if (state.status === 'error') {
    const notFound = state.error?.code === 'NOT_FOUND';
    return (
      <section className="empty-state">
        <div className={`empty-state__icon${notFound ? '' : ' empty-state__icon--error'}`}>
          <Icon name={notFound ? 'search' : 'alert'} size={26} />
        </div>
        <h2>{notFound ? 'Record not found' : 'We couldn’t load this record'}</h2>
        <p>
          {notFound
            ? 'This deceased person record does not exist or is no longer available.'
            : 'Something went wrong. Please try again.'}
        </p>
        {notFound ? (
          <Link className="btn btn--primary" to="/deceased">
            Back to registered cases
          </Link>
        ) : (
          <button className="btn btn--primary" onClick={load}>
            Try again
          </button>
        )}
      </section>
    );
  }

  const { person, documents } = state;
  const { applicant } = person;
  const isActive = person.id === activeId;
  const outstanding = documents.filter((d) => d.status === 'Required' || d.status === 'Pending');

  const openDashboard = () => {
    setActiveId(person.id);
    navigate('/dashboard');
  };

  const handleUpload = async (documentId, file) => {
    const updated = await uploadCaseDocument(person.id, documentId, file);
    setState((prev) => ({ ...prev, person: updated.person, documents: updated.documents }));
  };

  return (
    <div className="stack">
      <PageHeader
        backTo="/deceased"
        backLabel="Registered cases"
        title={person.name}
        actions={
          <button type="button" className="btn btn--primary" onClick={openDashboard}>
            Open in Dashboard <Icon name="arrow" size={16} />
          </button>
        }
      >
        <div className="page-header__meta">
          <span>Case {person.caseRef}</span>
          <StatusBadge status={isActive ? 'Active case' : 'Registered'} />
        </div>
      </PageHeader>

      {/* Case record ------------------------------------------------------ */}
      <section className="case-strip" aria-label="Case record">
        <div>
          <p className="eyebrow">Case reference</p>
          <p className="case-strip__value">{person.caseRef}</p>
        </div>
        <div>
          <p className="eyebrow">Created</p>
          <p className="case-strip__value">{formatDateShort(person.registeredOn)}</p>
        </div>
        <div>
          <p className="eyebrow">Last updated</p>
          <p className="case-strip__value">{formatDateShort(person.updatedOn)}</p>
        </div>
        <div>
          <p className="eyebrow">Documents outstanding</p>
          <p className="case-strip__value">
            {outstanding.length} of {documents.length}
          </p>
        </div>
      </section>

      <div className="details-grid">
        {/* Basic information ---------------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Basic information</h3>
              <p>Details of the deceased person</p>
            </div>
          </header>
          <dl className="detail-list">
            <div>
              <dt>Full name</dt>
              <dd>{person.name}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{person.gender}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{formatDate(person.dateOfBirth)}</dd>
            </div>
            <div>
              <dt>Date of death</dt>
              <dd>{formatDate(person.dateOfDeath)}</dd>
            </div>
            <div>
              <dt>Age at death</dt>
              <dd>{yearsBetween(person.dateOfBirth, person.dateOfDeath)} years</dd>
            </div>
            <div>
              <dt>PAN</dt>
              <dd className={person.maskedPan ? 'mono' : 'muted'}>
                {person.maskedPan ?? 'Not provided'}
              </dd>
            </div>
            <div className="detail-list__wide">
              <dt>Address</dt>
              <dd>
                {person.address}
                <br />
                {person.city}, {person.state} {person.pincode}
              </dd>
            </div>
          </dl>
        </section>

        {/* Applicant ------------------------------------------------------- */}
        <section className="panel">
          <header className="panel__header">
            <div>
              <h3>Applicant / legal heir</h3>
              <p>Who is managing this case</p>
            </div>
          </header>
          <dl className="detail-list detail-list--single">
            <div>
              <dt>Name</dt>
              <dd>{applicant.name}</dd>
            </div>
            <div>
              <dt>Relationship to deceased person</dt>
              <dd>{applicant.relationship}</dd>
            </div>
            <div>
              <dt>Contact number</dt>
              <dd className="mono">{applicant.maskedPhone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className="wrap">{applicant.email}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Documents --------------------------------------------------------- */}
      <section className="panel">
        <header className="panel__header">
          <div>
            <h3>Documents</h3>
            <p>
              {outstanding.length === 0
                ? 'All documents are in place.'
                : `${outstanding.length} still needed. Uploads are simulated in this demo.`}
            </p>
          </div>
        </header>

        {documents.length === 0 ? (
          <p className="panel__empty">No documents recorded for this case.</p>
        ) : (
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
                {documents.map((doc) => {
                  const needsUpload = doc.status === 'Required' || doc.status === 'Pending';
                  const error = uploadError.documentId === doc.id ? uploadError.message : null;
                  return (
                    <tr key={doc.id}>
                      <td data-label="Document">
                        <p className="table__primary">{doc.name}</p>
                        {doc.neededFor && <p className="table__secondary">For {doc.neededFor}</p>}
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
        )}
      </section>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading record">
      <div>
        <div className="skeleton skeleton--title" style={{ width: 240 }} />
        <div className="skeleton skeleton--line" style={{ width: 180 }} />
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
