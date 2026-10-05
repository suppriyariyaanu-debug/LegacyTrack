import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormField from '../components/ui/FormField';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import { useActiveCase } from '../context/CaseContext';
import { POLICY_MASK_PREFIX, POLICY_TYPES, INSURER_SUGGESTIONS } from '../data/constants';
import { addInsurancePolicy, getInsurancePolicies, getDeceasedPerson } from '../services/api';
import { formatCurrency, todayIso } from '../utils/format';
import {
  INSURANCE_POLICY_FIELD_ORDER,
  NOTES_MAX_LENGTH,
  validateInsurancePolicy,
} from '../utils/validation';

export default function InsurancePolicyForm() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const today = todayIso();

  const initialValues = useMemo(
    () => ({
      insuranceCompany: '',
      policyType: '',
      lastFourDigits: '',
      claimAmount: '',
      assetReference: '',
      identifiedDate: today,
      notes: '',
    }),
    [today],
  );

  const [context, setContext] = useState({ status: 'loading', person: null, policies: [] });
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const summaryRef = useRef(null);

  // The case name is shown in the header; existing policies stop duplicates.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getDeceasedPerson(activeId), getInsurancePolicies(activeId)])
      .then(
        ([person, policies]) => !cancelled && setContext({ status: 'ready', person, policies }),
      )
      .catch(() => !cancelled && setContext({ status: 'error', person: null, policies: [] }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const errors = useMemo(
    () => validateInsurancePolicy(values, context.policies, today),
    [values, context.policies, today],
  );
  const errorCount = Object.keys(errors).length;
  const visibleError = (name) => (submitted || touched[name] ? errors[name] : undefined);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const setValue = (name, value) => setValues((prev) => ({ ...prev, [name]: value }));
  const touch = (name) => setTouched((prev) => ({ ...prev, [name]: true }));

  const control = (name, describedByHint = false) => {
    const error = visibleError(name);
    return {
      id: name,
      name,
      className: 'input',
      value: values[name],
      onChange: (e) => setValue(name, e.target.value),
      onBlur: () => touch(name),
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${name}-error` : describedByHint ? `${name}-hint` : undefined,
    };
  };

  const amountNumber = Number(String(values.claimAmount).replace(/,/g, ''));
  const amountPreview =
    values.claimAmount && !errors.claimAmount ? formatCurrency(amountNumber) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError(null);

    if (errorCount > 0) {
      const firstInvalid = INSURANCE_POLICY_FIELD_ORDER.find((key) => errors[key]);
      summaryRef.current?.scrollIntoView({ block: 'center' });
      document.getElementById(firstInvalid)?.focus({ preventScroll: true });
      return;
    }

    setSaving(true);
    try {
      const policy = await addInsurancePolicy(activeId, values);
      navigate('/insurance', {
        state: { added: `${policy.insuranceCompany} ${policy.policyType}` },
      });
    } catch {
      setSaveError('We could not save the insurance policy. Please try again.');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) setConfirmDiscard(true);
    else navigate('/insurance');
  };

  if (context.status === 'error') {
    return (
      <section className="empty-state">
        <div className="empty-state__icon empty-state__icon--error">
          <Icon name="alert" size={26} />
        </div>
        <h2>We couldn&rsquo;t open this form</h2>
        <p>The active case could not be loaded. Please go back and try again.</p>
        <button className="btn btn--primary" onClick={() => navigate('/insurance')}>
          Back to Insurance Policies
        </button>
      </section>
    );
  }

  return (
    <form className="stack registration" onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/insurance"
        backLabel="Insurance Policies"
        title="Add Insurance Policy"
        description="Record an insurance policy you have identified. Fields marked * are required."
      >
        {context.person && (
          <div className="page-header__meta">
            <span>
              Case: <strong>{context.person.name}</strong> · {context.person.caseRef}
            </span>
          </div>
        )}
      </PageHeader>

      <div ref={summaryRef}>
        {submitted && errorCount > 0 && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={16} />
            {errorCount === 1
              ? 'Please correct the highlighted field before saving.'
              : `Please correct the ${errorCount} highlighted fields before saving.`}
          </div>
        )}
        {saveError && (
          <div className="alert alert--error" role="alert">
            <Icon name="alert" size={16} /> {saveError}
          </div>
        )}
      </div>

      {/* 1. Policy -------------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Policy details</legend>
        <div className="form-section__header">
          <span className="form-section__step" aria-hidden="true">
            1
          </span>
          <div>
            <h3>Policy details</h3>
            <p>From the policy bond, a premium receipt or a letter from the insurer.</p>
          </div>
        </div>

        <div className="form-grid">
          <FormField id="insuranceCompany" label="Insurance company" required error={visibleError('insuranceCompany')}>
            <input
              {...control('insuranceCompany')}
              type="text"
              list="insurer-suggestions"
              autoComplete="off"
              placeholder="e.g. LIC"
              maxLength={60}
            />
            <datalist id="insurer-suggestions">
              {INSURER_SUGGESTIONS.map((insurer) => (
                <option key={insurer} value={insurer} />
              ))}
            </datalist>
          </FormField>

          <FormField id="policyType" label="Policy type" required error={visibleError('policyType')}>
            <select {...control('policyType')}>
              <option value="">Select policy type</option>
              {POLICY_TYPES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </FormField>

          <FormField
            id="lastFourDigits"
            label="Masked policy number"
            required
            error={visibleError('lastFourDigits')}
            hint="Enter only the last 4 digits. The full number is never collected."
          >
            <div className={`input-group${visibleError('lastFourDigits') ? ' has-error' : ''}`}>
              <span className="input-group__prefix mono" aria-hidden="true">
                {POLICY_MASK_PREFIX}
              </span>
              <input
                {...control('lastFourDigits', true)}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="4582"
                maxLength={4}
                aria-label="Last 4 digits of the policy number"
                onChange={(e) => setValue('lastFourDigits', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
          </FormField>

          <FormField
            id="claimAmount"
            label="Claim amount"
            required
            error={visibleError('claimAmount')}
            hint={amountPreview ? `${amountPreview} · an estimate is fine` : 'The sum assured or the amount you expect to claim.'}
          >
            <div className={`input-group${visibleError('claimAmount') ? ' has-error' : ''}`}>
              <span className="input-group__prefix" aria-hidden="true">
                ₹
              </span>
              <input
                {...control('claimAmount', true)}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="500000"
                maxLength={14}
              />
            </div>
          </FormField>
        </div>
      </fieldset>

      {/* 2. Reference ----------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Reference and notes</legend>
        <div className="form-section__header">
          <span className="form-section__step" aria-hidden="true">
            2
          </span>
          <div>
            <h3>Reference and notes</h3>
            <p>How you will recognise this policy later.</p>
          </div>
        </div>

        <div className="form-grid">
          <FormField
            id="assetReference"
            label="Asset reference"
            error={visibleError('assetReference')}
            hint="Leave blank to have one generated."
          >
            <input
              {...control('assetReference', true)}
              type="text"
              autoComplete="off"
              placeholder="AST-INS-0005"
              maxLength={20}
              onChange={(e) => setValue('assetReference', e.target.value.toUpperCase())}
            />
          </FormField>

          <FormField
            id="identifiedDate"
            label="Identification date"
            required
            error={visibleError('identifiedDate')}
            hint="When this policy was found."
          >
            <input {...control('identifiedDate', true)} type="date" min="1900-01-01" max={today} />
          </FormField>

          <FormField
            id="notes"
            label="Notes"
            wide
            error={visibleError('notes')}
            hint={`${values.notes.length} / ${NOTES_MAX_LENGTH} characters`}
          >
            <textarea
              {...control('notes', true)}
              rows={3}
              placeholder="Where the policy was found, the nominee named, an agent's name, anything worth remembering."
            />
          </FormField>
        </div>

        <p className="form-note">
          <Icon name="info" size={14} />
          LegacyTrack does not connect to any insurer or regulator. Record only what you already
          know, and use fictional values in this demo.
        </p>
      </fieldset>

      <div className="form-actions">
        <button type="button" className="btn btn--secondary" onClick={handleCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={saving || context.status !== 'ready'}
        >
          {saving ? 'Saving…' : 'Add Insurance Policy'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this insurance policy?"
        message="The details you have entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={() => navigate('/insurance')}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  );
}
