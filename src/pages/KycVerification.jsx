import { useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import FormField from '../components/ui/FormField';
import Icon from '../components/ui/Icon';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { useKyc } from '../context/KycContext';
import { verifyKyc } from '../services/api';
import { formatDateShort, todayIso } from '../utils/format';
import { KYC_FIELD_ORDER, validateKyc } from '../utils/validation';

/** Fictional values for quick demos. None of these belong to a real person. */
const DEMO_VALUES = {
  dateOfBirth: '1988-04-12',
  mobile: '9876543210',
  pan: 'ABCDE1234F',
  aadhaar: '1234 5678 9012',
};

const STEPS = ['Sign in', 'Legal heir KYC', 'Access the case'];

/** "123456789012" -> "1234 5678 9012" while typing; digits only, 12 at most. */
const formatAadhaar = (value) =>
  value
    .replace(/\D/g, '')
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, '$1 ');

export default function KycVerification() {
  const { user, logout } = useAuth();
  const { isVerified, markVerified } = useKyc();
  const navigate = useNavigate();
  const location = useLocation();
  const today = todayIso();
  const destination = location.state?.from ?? '/dashboard';
  const wasReset = Boolean(location.state?.reset);

  const [values, setValues] = useState({
    fullName: user.name,
    dateOfBirth: '',
    mobile: '',
    pan: '',
    aadhaar: '',
  });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  // 'form' -> 'verifying' -> 'success'
  const [phase, setPhase] = useState('form');
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const summaryRef = useRef(null);

  const errors = useMemo(() => validateKyc(values, today), [values, today]);
  const errorCount = Object.keys(errors).length;
  const visibleError = (name) => (submitted || touched[name] ? errors[name] : undefined);

  // Already verified in this session (for example after a refresh): go straight in.
  if (isVerified && phase !== 'success') return <Navigate to={destination} replace />;

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const touch = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  const control = (name, hasHint = false) => {
    const error = visibleError(name);
    return {
      id: name,
      name,
      className: 'input',
      value: values[name],
      onChange: (e) => setValue(name, e.target.value),
      onBlur: () => touch(name),
      disabled: phase === 'verifying',
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${name}-error` : hasHint ? `${name}-hint` : undefined,
    };
  };

  const fillDemo = () => {
    setValues((prev) => ({ ...prev, fullName: prev.fullName || user.name, ...DEMO_VALUES }));
    setFailure(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setFailure(null);

    if (errorCount > 0) {
      const firstInvalid = KYC_FIELD_ORDER.find((key) => errors[key]);
      summaryRef.current?.scrollIntoView({ block: 'center' });
      document.getElementById(firstInvalid)?.focus({ preventScroll: true });
      return;
    }

    setPhase('verifying');
    try {
      const record = await verifyKyc(values);
      setResult(record);
      setPhase('success');
      markVerified(record);
      window.scrollTo({ top: 0 });
    } catch {
      setFailure('The demo verification could not be completed. Please try again.');
      setPhase('form');
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const currentStep = phase === 'success' ? 2 : 1;

  return (
    <div className="login kyc">
      <aside className="login__brand">
        <Logo tone="light" />
        <div className="login__pitch">
          <h1>Legal Heir KYC Verification</h1>
          <p>
            Before a deceased person&rsquo;s financial information is shown, LegacyTrack confirms
            that the person asking is the legal heir.
          </p>
          <ol className="kyc-steps" aria-label="Progress">
            {STEPS.map((step, index) => {
              const state = index < currentStep ? 'done' : index === currentStep ? 'current' : 'upcoming';
              return (
                <li
                  key={step}
                  className={`kyc-steps__item is-${state}`}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span className="kyc-steps__marker" aria-hidden="true">
                    {state === 'done' ? <Icon name="tick" size={14} /> : index + 1}
                  </span>
                  <span>
                    {step}
                    <span className="sr-only">
                      {state === 'done' ? ' (completed)' : state === 'current' ? ' (current step)' : ''}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <p className="login__footnote">
          Prototype for demonstration. KYC is simulated and all data shown is fictional.
        </p>
      </aside>

      <main className="login__panel kyc__panel">
        <div className="kyc__card">
          <div className="kyc__top">
            <div className="login__mobile-logo">
              <Logo />
            </div>
            <span className="badge badge--warning kyc__demo-badge">
              <span className="badge__dot" aria-hidden="true" />
              Demo · simulated verification
            </span>
          </div>

          {phase === 'success' ? (
            <section className="kyc-success" role="status">
              <div className="success-card__icon">
                <Icon name="check" size={30} />
              </div>
              <h2>KYC Verified Successfully</h2>
              <p className="kyc__lead">Your identity has been verified as the legal heir.</p>

              <dl className="detail-list kyc-success__facts">
                <div>
                  <dt>Full name</dt>
                  <dd>{result.fullName}</dd>
                </div>
                <div>
                  <dt>Verified on</dt>
                  <dd>{formatDateShort(result.verifiedOn)}</dd>
                </div>
                <div>
                  <dt>Mobile number</dt>
                  <dd className="mono">{result.maskedMobile}</dd>
                </div>
                <div>
                  <dt>PAN</dt>
                  <dd className="mono">{result.maskedPan}</dd>
                </div>
                <div className="detail-list__wide">
                  <dt>Aadhaar</dt>
                  <dd className="mono">{result.maskedAadhaar}</dd>
                </div>
              </dl>

              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => navigate(destination, { replace: true })}
              >
                Continue to LegacyTrack <Icon name="arrow" size={16} />
              </button>

              <p className="form-note">
                <Icon name="info" size={14} />
                This was a simulated verification for demonstration. No external KYC service was
                contacted.
              </p>
            </section>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <h2>Legal Heir KYC Verification</h2>
              <p className="kyc__lead">
                Verify your identity as the legal heir to access the deceased person&rsquo;s
                financial information.
              </p>

              <div ref={summaryRef}>
                {wasReset && !submitted && (
                  <div className="alert alert--success" role="status">
                    <Icon name="check" size={18} />
                    <span>Demo data has been reset. Complete the demo KYC again to continue.</span>
                  </div>
                )}
                {submitted && errorCount > 0 && (
                  <div className="alert alert--error" role="alert">
                    <Icon name="alert" size={16} />
                    {errorCount === 1
                      ? 'Please correct the highlighted field before verifying.'
                      : `Please correct the ${errorCount} highlighted fields before verifying.`}
                  </div>
                )}
                {failure && (
                  <div className="alert alert--error" role="alert">
                    <Icon name="alert" size={16} /> {failure}
                  </div>
                )}
              </div>

              <div className="form-grid kyc__grid">
                <FormField
                  id="fullName"
                  label="Full name"
                  required
                  wide
                  error={visibleError('fullName')}
                  hint="As it appears on your PAN card."
                >
                  <input {...control('fullName', true)} type="text" autoComplete="name" maxLength={80} />
                </FormField>

                <FormField
                  id="dateOfBirth"
                  label="Date of birth"
                  required
                  error={visibleError('dateOfBirth')}
                  hint="As on your identity documents."
                >
                  <input {...control('dateOfBirth', true)} type="date" min="1900-01-01" max={today} />
                </FormField>

                <FormField
                  id="mobile"
                  label="Mobile number"
                  required
                  error={visibleError('mobile')}
                  hint="10-digit Indian mobile number."
                >
                  <input
                    {...control('mobile', true)}
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="98765 43210"
                    maxLength={16}
                  />
                </FormField>

                <FormField
                  id="pan"
                  label="PAN number"
                  required
                  error={visibleError('pan')}
                  hint="Format: ABCDE1234F."
                >
                  <input
                    {...control('pan', true)}
                    type="text"
                    autoComplete="off"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    onChange={(e) => setValue('pan', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  />
                </FormField>

                <FormField
                  id="aadhaar"
                  label="Aadhaar number"
                  required
                  error={visibleError('aadhaar')}
                  hint="12 digits."
                >
                  <input
                    {...control('aadhaar', true)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="1234 5678 9012"
                    maxLength={14}
                    onChange={(e) => setValue('aadhaar', formatAadhaar(e.target.value))}
                  />
                </FormField>
              </div>

              <p className="form-note kyc__note">
                <Icon name="info" size={14} />
                <span>
                  <strong>Simulated KYC for demonstration.</strong> Nothing is sent to UIDAI, the
                  Income Tax Department, a bank or any KYC service, and nothing is checked against
                  real records. Please use fictional details.
                </span>
              </p>

              {phase === 'verifying' ? (
                <div className="kyc-verifying" role="status">
                  <span className="kyc-spinner" aria-hidden="true" />
                  <div>
                    <p className="kyc-verifying__title">Verifying your details…</p>
                    <p>Running the simulated KYC check. This takes a moment.</p>
                  </div>
                </div>
              ) : (
                <div className="kyc__actions">
                  <button type="submit" className="btn btn--primary btn--block">
                    Verify KYC
                  </button>
                  <button type="button" className="btn btn--secondary btn--block" onClick={fillDemo}>
                    Fill demo details
                  </button>
                </div>
              )}

              <p className="kyc__signout">
                Signed in as {user.email}.{' '}
                <button type="button" className="link" onClick={handleSignOut}>
                  Sign out
                </button>
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
