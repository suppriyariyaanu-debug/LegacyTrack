import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import DocumentUploadRow from '../components/ui/DocumentUploadRow';
import FormField from '../components/ui/FormField';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useActiveCase } from '../context/CaseContext';
import { GENDERS, INDIAN_STATES, REGISTRATION_DOCUMENTS, RELATIONSHIPS } from '../data/constants';
import { registerDeceasedPerson } from '../services/api';
import { formatDateShort, todayIso } from '../utils/format';
import { REGISTRATION_FIELD_ORDER, validateRegistration } from '../utils/validation';

const EMPTY_FILES = Object.fromEntries(REGISTRATION_DOCUMENTS.map((d) => [d.key, null]));

/** Fictional values for quick demos. */
const SAMPLE_VALUES = {
  fullName: 'Sunita Kumar',
  dateOfBirth: '1962-11-03',
  dateOfDeath: '2026-09-12',
  gender: 'Female',
  pan: 'ABCDE1234F',
  address: '14, Shanti Niketan Society, Karve Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411004',
  relationship: 'Daughter',
  applicantPhone: '9876543210',
};
const SAMPLE_FILES = {
  ...EMPTY_FILES,
  deathCertificate: { fileName: 'death-certificate-sample.pdf', size: 248000 },
  identityProof: { fileName: 'identity-proof-sample.pdf', size: 186000 },
};

export default function DeceasedRegistration() {
  const { user } = useAuth();
  const { setActiveId } = useActiveCase();
  const navigate = useNavigate();
  const today = todayIso();

  const initialValues = useMemo(
    () => ({
      fullName: '',
      dateOfBirth: '',
      dateOfDeath: '',
      gender: '',
      pan: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      relationship: '',
      // The signed-in user is normally the applicant, so start from their details.
      applicantName: user.name,
      applicantPhone: '',
      applicantEmail: user.email,
    }),
    [user],
  );

  const [values, setValues] = useState(initialValues);
  const [files, setFiles] = useState(EMPTY_FILES);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [result, setResult] = useState(null);
  const summaryRef = useRef(null);

  const errors = useMemo(() => validateRegistration(values, files, today), [values, files, today]);
  const errorCount = Object.keys(errors).length;
  const visibleError = (name) => (submitted || touched[name] ? errors[name] : undefined);

  const isDirty =
    JSON.stringify(values) !== JSON.stringify(initialValues) ||
    Object.values(files).some(Boolean);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const touch = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  /** Shared props for every text input, select and textarea. */
  const control = (name) => {
    const error = visibleError(name);
    return {
      id: name,
      name,
      className: 'input',
      value: values[name],
      onChange: (e) => setValue(name, e.target.value),
      onBlur: () => touch(name),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${name}-error` : undefined,
    };
  };

  const fillSample = () => {
    setValues({ ...initialValues, ...SAMPLE_VALUES });
    setFiles(SAMPLE_FILES);
    setSaveError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError(null);

    if (errorCount > 0) {
      const firstInvalid = REGISTRATION_FIELD_ORDER.find((key) => errors[key]);
      summaryRef.current?.scrollIntoView({ block: 'center' });
      document.getElementById(firstInvalid)?.focus({ preventScroll: true });
      return;
    }

    setSaving(true);
    try {
      const created = await registerDeceasedPerson(values, files);
      setActiveId(created.person.id);
      setResult(created);
      window.scrollTo({ top: 0 });
    } catch {
      setSaveError('We could not save the registration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) setConfirmDiscard(true);
    else navigate('/deceased');
  };

  if (result) return <RegistrationSuccess result={result} />;

  return (
    <form className="stack registration" onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/deceased"
        backLabel="Registered cases"
        title="Register a deceased person"
        description="Record the person's details, who is applying, and the supporting documents. Fields marked * are required."
        actions={
          <button type="button" className="btn btn--ghost btn--sm" onClick={fillSample}>
            Fill sample data
          </button>
        }
      />

      <div ref={summaryRef}>
        {submitted && errorCount > 0 && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={16} />
            {errorCount === 1
              ? 'Please correct the highlighted field before registering.'
              : `Please correct the ${errorCount} highlighted fields before registering.`}
          </div>
        )}
        {saveError && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={16} /> {saveError}
          </div>
        )}
      </div>

      {/* 1. Deceased person ---------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Deceased person details</legend>
        <SectionHeader
          step={1}
          title="Deceased person details"
          description="As written on the death certificate."
        />
        <div className="form-grid">
          <FormField
            id="fullName"
            label="Full name"
            required
            wide
            error={visibleError('fullName')}
          >
            <input {...control('fullName')} type="text" autoComplete="off" maxLength={80} />
          </FormField>

          <FormField id="dateOfBirth" label="Date of birth" required error={visibleError('dateOfBirth')}>
            <input {...control('dateOfBirth')} type="date" min="1900-01-01" max={today} />
          </FormField>

          <FormField id="dateOfDeath" label="Date of death" required error={visibleError('dateOfDeath')}>
            <input
              {...control('dateOfDeath')}
              type="date"
              min={values.dateOfBirth || '1900-01-01'}
              max={today}
            />
          </FormField>

          <FormField id="gender" label="Gender" required error={visibleError('gender')}>
            <select {...control('gender')}>
              <option value="">Select gender</option>
              {GENDERS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </FormField>

          <FormField
            id="pan"
            label="PAN"
            error={visibleError('pan')}
            hint="Shown masked after saving. Use a fictional PAN in this demo."
          >
            <input
              {...control('pan')}
              type="text"
              autoComplete="off"
              placeholder="ABCDE1234F"
              maxLength={10}
              onChange={(e) => setValue('pan', e.target.value.toUpperCase())}
              aria-describedby={visibleError('pan') ? 'pan-error' : 'pan-hint'}
            />
          </FormField>
        </div>
      </fieldset>

      {/* 2. Address ------------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Last residential address</legend>
        <SectionHeader
          step={2}
          title="Last residential address"
          description="Where the deceased person last lived."
        />
        <div className="form-grid">
          <FormField id="address" label="Address" required wide error={visibleError('address')}>
            <textarea {...control('address')} rows={2} maxLength={200} />
          </FormField>

          <FormField id="city" label="City" required error={visibleError('city')}>
            <input {...control('city')} type="text" maxLength={60} />
          </FormField>

          <FormField id="state" label="State" required error={visibleError('state')}>
            <select {...control('state')}>
              <option value="">Select state or union territory</option>
              {INDIAN_STATES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </FormField>

          <FormField id="pincode" label="Pincode" required error={visibleError('pincode')}>
            <input
              {...control('pincode')}
              type="text"
              inputMode="numeric"
              placeholder="6 digits"
              maxLength={6}
              onChange={(e) => setValue('pincode', e.target.value.replace(/\D/g, ''))}
            />
          </FormField>
        </div>
      </fieldset>

      {/* 3. Applicant ----------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Applicant or legal heir</legend>
        <SectionHeader
          step={3}
          title="Applicant / legal heir"
          description="The person who will manage this case and file the claims."
        />
        <div className="form-grid">
          <FormField
            id="relationship"
            label="Relationship to deceased person"
            required
            error={visibleError('relationship')}
          >
            <select {...control('relationship')}>
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </FormField>

          <FormField
            id="applicantName"
            label="Applicant / legal heir name"
            required
            error={visibleError('applicantName')}
          >
            <input {...control('applicantName')} type="text" autoComplete="name" maxLength={80} />
          </FormField>

          <FormField
            id="applicantPhone"
            label="Contact number"
            required
            error={visibleError('applicantPhone')}
            hint="10-digit Indian mobile number."
          >
            <input
              {...control('applicantPhone')}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              maxLength={16}
              aria-describedby={
                visibleError('applicantPhone') ? 'applicantPhone-error' : 'applicantPhone-hint'
              }
            />
          </FormField>

          <FormField id="applicantEmail" label="Email" required error={visibleError('applicantEmail')}>
            <input
              {...control('applicantEmail')}
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              maxLength={120}
            />
          </FormField>
        </div>
      </fieldset>

      {/* 4. Documents ----------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Supporting documents</legend>
        <SectionHeader
          step={4}
          title="Supporting documents"
          description="PDF, JPG or PNG up to 5 MB each. You can add the optional ones later."
        />
        <ul className="upload-list">
          {REGISTRATION_DOCUMENTS.map((doc) => (
            <DocumentUploadRow
              key={doc.key}
              id={doc.key}
              name={doc.name}
              hint={doc.hint}
              required={doc.required}
              file={files[doc.key]}
              error={visibleError(doc.key)}
              onChange={(file) => {
                setFiles((prev) => ({ ...prev, [doc.key]: file }));
                touch(doc.key);
              }}
            />
          ))}
        </ul>
        <p className="form-note">
          <Icon name="info" size={14} />
          Demo upload: only the file name is recorded. Files are not stored or sent anywhere.
        </p>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? 'Registering…' : 'Register deceased person'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this registration?"
        message="The details you have entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={() => navigate('/deceased')}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  );
}

function SectionHeader({ step, title, description }) {
  return (
    <div className="form-section__header">
      <span className="form-section__step" aria-hidden="true">
        {step}
      </span>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function RegistrationSuccess({ result }) {
  const { person, documents } = result;
  const uploaded = documents.filter((d) => d.status === 'Uploaded').length;

  return (
    <section className="success-card" role="status">
      <div className="success-card__icon">
        <Icon name="check" size={30} />
      </div>
      <h2>Registration complete</h2>
      <p>
        <strong>{person.name}</strong> has been registered and is now your active case.
      </p>

      <dl className="detail-list success-card__facts">
        <div>
          <dt>Case reference</dt>
          <dd>{person.caseRef}</dd>
        </div>
        <div>
          <dt>Registered on</dt>
          <dd>{formatDateShort(person.registeredOn)}</dd>
        </div>
        <div>
          <dt>Documents uploaded</dt>
          <dd>
            {uploaded} of {documents.length}
          </dd>
        </div>
      </dl>

      <div className="success-card__actions">
        <Link className="btn btn--primary" to={`/deceased/${person.id}`}>
          View details <Icon name="arrow" size={16} />
        </Link>
        <Link className="btn btn--secondary" to="/dashboard">
          Go to Dashboard
        </Link>
      </div>
    </section>
  );
}
