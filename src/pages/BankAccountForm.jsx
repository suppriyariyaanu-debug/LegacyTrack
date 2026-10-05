import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import FormField from '../components/ui/FormField';
import Icon from '../components/ui/Icon';
import PageHeader from '../components/ui/PageHeader';
import { useActiveCase } from '../context/CaseContext';
import { ACCOUNT_MASK_PREFIX, ACCOUNT_TYPES, BANK_SUGGESTIONS } from '../data/constants';
import { addBankAccount, getBankAccounts, getDeceasedPerson } from '../services/api';
import { formatCurrency, todayIso } from '../utils/format';
import {
  BANK_ACCOUNT_FIELD_ORDER,
  NOTES_MAX_LENGTH,
  validateBankAccount,
} from '../utils/validation';

export default function BankAccountForm() {
  const { activeId } = useActiveCase();
  const navigate = useNavigate();
  const today = todayIso();

  const initialValues = useMemo(
    () => ({
      bankName: '',
      accountType: '',
      lastFourDigits: '',
      estimatedAmount: '',
      assetReference: '',
      identifiedDate: today,
      notes: '',
    }),
    [today],
  );

  const [context, setContext] = useState({ status: 'loading', person: null, accounts: [] });
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const summaryRef = useRef(null);

  // The case name is shown in the header; existing accounts stop duplicates.
  useEffect(() => {
    let cancelled = false;
    Promise.all([getDeceasedPerson(activeId), getBankAccounts(activeId)])
      .then(
        ([person, accounts]) => !cancelled && setContext({ status: 'ready', person, accounts }),
      )
      .catch(() => !cancelled && setContext({ status: 'error', person: null, accounts: [] }));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const errors = useMemo(
    () => validateBankAccount(values, context.accounts, today),
    [values, context.accounts, today],
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

  const amountNumber = Number(String(values.estimatedAmount).replace(/,/g, ''));
  const amountPreview =
    values.estimatedAmount && !errors.estimatedAmount ? formatCurrency(amountNumber) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setSaveError(null);

    if (errorCount > 0) {
      const firstInvalid = BANK_ACCOUNT_FIELD_ORDER.find((key) => errors[key]);
      summaryRef.current?.scrollIntoView({ block: 'center' });
      document.getElementById(firstInvalid)?.focus({ preventScroll: true });
      return;
    }

    setSaving(true);
    try {
      const account = await addBankAccount(activeId, values);
      navigate('/bank-accounts', {
        state: { added: `${account.bankName} ${account.accountType}` },
      });
    } catch {
      setSaveError('We could not save the bank account. Please try again.');
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) setConfirmDiscard(true);
    else navigate('/bank-accounts');
  };

  if (context.status === 'error') {
    return (
      <section className="empty-state">
        <div className="empty-state__icon empty-state__icon--error">
          <Icon name="alert" size={26} />
        </div>
        <h2>We couldn&rsquo;t open this form</h2>
        <p>The active case could not be loaded. Please go back and try again.</p>
        <button className="btn btn--primary" onClick={() => navigate('/bank-accounts')}>
          Back to Bank Accounts
        </button>
      </section>
    );
  }

  return (
    <form className="stack registration" onSubmit={handleSubmit} noValidate>
      <PageHeader
        backTo="/bank-accounts"
        backLabel="Bank Accounts"
        title="Add Bank Account"
        description="Record a bank account or deposit you have identified. Fields marked * are required."
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

      {/* 1. Account ------------------------------------------------------- */}
      <fieldset className="panel form-section">
        <legend className="sr-only">Account details</legend>
        <div className="form-section__header">
          <span className="form-section__step" aria-hidden="true">
            1
          </span>
          <div>
            <h3>Account details</h3>
            <p>From a passbook, statement, deposit receipt or cheque book.</p>
          </div>
        </div>

        <div className="form-grid">
          <FormField id="bankName" label="Bank name" required error={visibleError('bankName')}>
            <input
              {...control('bankName')}
              type="text"
              list="bank-suggestions"
              autoComplete="off"
              placeholder="e.g. SBI"
              maxLength={60}
            />
            <datalist id="bank-suggestions">
              {BANK_SUGGESTIONS.map((bank) => (
                <option key={bank} value={bank} />
              ))}
            </datalist>
          </FormField>

          <FormField id="accountType" label="Account type" required error={visibleError('accountType')}>
            <select {...control('accountType')}>
              <option value="">Select account type</option>
              {ACCOUNT_TYPES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </FormField>

          <FormField
            id="lastFourDigits"
            label="Masked account number"
            required
            error={visibleError('lastFourDigits')}
            hint="Enter only the last 4 digits. The full number is never collected."
          >
            <div className={`input-group${visibleError('lastFourDigits') ? ' has-error' : ''}`}>
              <span className="input-group__prefix mono" aria-hidden="true">
                {ACCOUNT_MASK_PREFIX}
              </span>
              <input
                {...control('lastFourDigits', true)}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="1234"
                maxLength={4}
                aria-label="Last 4 digits of the account number"
                onChange={(e) => setValue('lastFourDigits', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
          </FormField>

          <FormField
            id="estimatedAmount"
            label="Estimated amount"
            required
            error={visibleError('estimatedAmount')}
            hint={amountPreview ? `${amountPreview} · an estimate is fine` : 'Your best estimate of the balance or deposit value.'}
          >
            <div className={`input-group${visibleError('estimatedAmount') ? ' has-error' : ''}`}>
              <span className="input-group__prefix" aria-hidden="true">
                ₹
              </span>
              <input
                {...control('estimatedAmount', true)}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="245000"
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
            <p>How you will recognise this asset later.</p>
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
              placeholder="AST-BNK-0005"
              maxLength={20}
              onChange={(e) => setValue('assetReference', e.target.value.toUpperCase())}
            />
          </FormField>

          <FormField
            id="identifiedDate"
            label="Identification date"
            required
            error={visibleError('identifiedDate')}
            hint="When this account was found."
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
              placeholder="Where the account was found, branch, joint holder, anything worth remembering."
            />
          </FormField>
        </div>

        <p className="form-note">
          <Icon name="info" size={14} />
          LegacyTrack does not connect to any bank. Record only what you already know, and use
          fictional values in this demo.
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
          {saving ? 'Saving…' : 'Add Bank Account'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this bank account?"
        message="The details you have entered will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        danger
        onConfirm={() => navigate('/bank-accounts')}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  );
}
