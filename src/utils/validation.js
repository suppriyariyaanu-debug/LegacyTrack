import { REGISTRATION_DOCUMENTS } from '../data/constants';
import { normalisePhone } from './mask';

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;
const MOBILE_PATTERN = /^[6-9][0-9]{9}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EARLIEST_DATE = '1900-01-01';

function isRealDate(iso) {
  if (!ISO_DATE_PATTERN.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function personName(value, label) {
  const name = value.trim();
  if (!name) return `Enter ${label}.`;
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (!NAME_PATTERN.test(name)) return 'Use letters, spaces, apostrophes, hyphens and full stops only.';
  return null;
}

/** Order matters: the first key with an error receives focus on submit. */
export const REGISTRATION_FIELD_ORDER = [
  'fullName',
  'dateOfBirth',
  'dateOfDeath',
  'gender',
  'pan',
  'address',
  'city',
  'state',
  'pincode',
  'relationship',
  'applicantName',
  'applicantPhone',
  'applicantEmail',
  ...REGISTRATION_DOCUMENTS.map((d) => d.key),
];

/**
 * Validates the deceased person registration form.
 * Returns an object of `{ fieldName: message }` containing only failing fields.
 * ISO dates ("YYYY-MM-DD") compare correctly as strings.
 */
export function validateRegistration(values, files, today) {
  const errors = {};
  const set = (key, message) => {
    if (message) errors[key] = message;
  };

  set('fullName', personName(values.fullName, "the deceased person's full name"));

  if (!values.dateOfBirth) set('dateOfBirth', 'Enter the date of birth.');
  else if (!isRealDate(values.dateOfBirth)) set('dateOfBirth', 'Enter a valid date.');
  else if (values.dateOfBirth > today) set('dateOfBirth', 'Date of birth cannot be in the future.');
  else if (values.dateOfBirth < EARLIEST_DATE) set('dateOfBirth', 'Enter a date after 01/01/1900.');

  if (!values.dateOfDeath) set('dateOfDeath', 'Enter the date of death.');
  else if (!isRealDate(values.dateOfDeath)) set('dateOfDeath', 'Enter a valid date.');
  else if (values.dateOfDeath > today) set('dateOfDeath', 'Date of death cannot be in the future.');
  else if (values.dateOfBirth && isRealDate(values.dateOfBirth) && values.dateOfDeath < values.dateOfBirth)
    set('dateOfDeath', 'Date of death cannot be before the date of birth.');

  if (!values.gender) set('gender', 'Select a gender.');

  const pan = values.pan.trim().toUpperCase();
  if (pan && !PAN_PATTERN.test(pan))
    set('pan', 'PAN must be 10 characters in the format ABCDE1234F.');

  const address = values.address.trim();
  if (!address) set('address', 'Enter the address.');
  else if (address.length < 5) set('address', 'Address must be at least 5 characters.');

  const city = values.city.trim();
  if (!city) set('city', 'Enter the city.');
  else if (!NAME_PATTERN.test(city)) set('city', 'City can contain letters and spaces only.');

  if (!values.state) set('state', 'Select a state or union territory.');

  const pincode = values.pincode.trim();
  if (!pincode) set('pincode', 'Enter the pincode.');
  else if (!PINCODE_PATTERN.test(pincode)) set('pincode', 'Pincode must be 6 digits and cannot start with 0.');

  if (!values.relationship) set('relationship', 'Select the relationship to the deceased person.');

  set('applicantName', personName(values.applicantName, "the applicant's full name"));

  if (!values.applicantPhone.trim()) set('applicantPhone', 'Enter a contact number.');
  else if (!MOBILE_PATTERN.test(normalisePhone(values.applicantPhone)))
    set('applicantPhone', 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.');

  const email = values.applicantEmail.trim();
  if (!email) set('applicantEmail', 'Enter an email address.');
  else if (!EMAIL_PATTERN.test(email)) set('applicantEmail', 'Enter a valid email address, like name@example.com.');

  REGISTRATION_DOCUMENTS.forEach((doc) => {
    if (doc.required && !files[doc.key]) set(doc.key, `Upload the ${doc.name} to continue.`);
  });

  return errors;
}

/* Bank accounts ---------------------------------------------------------- */

const BANK_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 .&'-]*$/;
const LAST_FOUR_PATTERN = /^[0-9]{4}$/;
const AMOUNT_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{2,19}$/;
const MAX_AMOUNT = 1000000000; // ₹100 crore
export const NOTES_MAX_LENGTH = 300;

export const BANK_ACCOUNT_FIELD_ORDER = [
  'bankName',
  'accountType',
  'lastFourDigits',
  'estimatedAmount',
  'assetReference',
  'identifiedDate',
  'notes',
];

/**
 * Validates the Add Bank Account form.
 * `existing` is the active case's current accounts, used to stop duplicates.
 */
export function validateBankAccount(values, existing, today) {
  const errors = {};
  const set = (key, message) => {
    if (message) errors[key] = message;
  };

  const bankName = values.bankName.trim();
  if (!bankName) set('bankName', 'Enter the bank name.');
  else if (bankName.length < 2) set('bankName', 'Bank name must be at least 2 characters.');
  else if (!BANK_NAME_PATTERN.test(bankName))
    set('bankName', 'Use letters, numbers, spaces and . & \' - only.');

  if (!values.accountType) set('accountType', 'Select an account type.');

  if (!values.lastFourDigits) set('lastFourDigits', 'Enter the last 4 digits of the account number.');
  else if (!LAST_FOUR_PATTERN.test(values.lastFourDigits))
    set('lastFourDigits', 'Enter exactly 4 digits.');
  else if (
    bankName &&
    values.accountType &&
    existing.some(
      (a) =>
        a.bankName.toLowerCase() === bankName.toLowerCase() &&
        a.accountType === values.accountType &&
        a.maskedAccountNumber.endsWith(values.lastFourDigits),
    )
  )
    set('lastFourDigits', 'This account has already been added to this case.');

  const amount = String(values.estimatedAmount).replace(/,/g, '').trim();
  if (!amount) set('estimatedAmount', 'Enter the estimated amount.');
  else if (!AMOUNT_PATTERN.test(amount))
    set('estimatedAmount', 'Enter an amount in rupees using digits only, like 245000.');
  else if (Number(amount) <= 0) set('estimatedAmount', 'Amount must be greater than zero.');
  else if (Number(amount) > MAX_AMOUNT) set('estimatedAmount', 'Amount cannot be more than ₹100 crore.');

  const reference = values.assetReference.trim();
  if (reference && !REFERENCE_PATTERN.test(reference))
    set('assetReference', 'Use 3 to 20 letters, numbers, hyphens or slashes.');
  else if (
    reference &&
    existing.some((a) => a.assetReference.toLowerCase() === reference.toLowerCase())
  )
    set('assetReference', 'This asset reference is already used in this case.');

  if (!values.identifiedDate) set('identifiedDate', 'Enter the identification date.');
  else if (!isRealDate(values.identifiedDate)) set('identifiedDate', 'Enter a valid date.');
  else if (values.identifiedDate > today)
    set('identifiedDate', 'Identification date cannot be in the future.');
  else if (values.identifiedDate < EARLIEST_DATE)
    set('identifiedDate', 'Enter a date after 01/01/1900.');

  if (values.notes.length > NOTES_MAX_LENGTH)
    set('notes', `Notes cannot be longer than ${NOTES_MAX_LENGTH} characters.`);

  return errors;
}

/* Insurance policies ----------------------------------------------------- */

export const INSURANCE_POLICY_FIELD_ORDER = [
  'insuranceCompany',
  'policyType',
  'lastFourDigits',
  'claimAmount',
  'assetReference',
  'identifiedDate',
  'notes',
];

/**
 * Validates the Add Insurance Policy form (same rules as bank accounts).
 * `existing` is the active case's current policies, used to stop duplicates.
 */
export function validateInsurancePolicy(values, existing, today) {
  const errors = {};
  const set = (key, message) => {
    if (message) errors[key] = message;
  };

  const company = values.insuranceCompany.trim();
  if (!company) set('insuranceCompany', 'Enter the insurance company.');
  else if (company.length < 2) set('insuranceCompany', 'Company name must be at least 2 characters.');
  else if (!BANK_NAME_PATTERN.test(company))
    set('insuranceCompany', 'Use letters, numbers, spaces and . & \' - only.');

  if (!values.policyType) set('policyType', 'Select a policy type.');

  if (!values.lastFourDigits) set('lastFourDigits', 'Enter the last 4 digits of the policy number.');
  else if (!LAST_FOUR_PATTERN.test(values.lastFourDigits))
    set('lastFourDigits', 'Enter exactly 4 digits.');
  else if (
    company &&
    values.policyType &&
    existing.some(
      (p) =>
        p.insuranceCompany.toLowerCase() === company.toLowerCase() &&
        p.policyType === values.policyType &&
        p.maskedPolicyNumber.endsWith(values.lastFourDigits),
    )
  )
    set('lastFourDigits', 'This policy has already been added to this case.');

  const amount = String(values.claimAmount).replace(/,/g, '').trim();
  if (!amount) set('claimAmount', 'Enter the claim amount.');
  else if (!AMOUNT_PATTERN.test(amount))
    set('claimAmount', 'Enter an amount in rupees using digits only, like 500000.');
  else if (Number(amount) <= 0) set('claimAmount', 'Amount must be greater than zero.');
  else if (Number(amount) > MAX_AMOUNT) set('claimAmount', 'Amount cannot be more than ₹100 crore.');

  const reference = values.assetReference.trim();
  if (reference && !REFERENCE_PATTERN.test(reference))
    set('assetReference', 'Use 3 to 20 letters, numbers, hyphens or slashes.');
  else if (
    reference &&
    existing.some((p) => p.assetReference.toLowerCase() === reference.toLowerCase())
  )
    set('assetReference', 'This asset reference is already used in this case.');

  if (!values.identifiedDate) set('identifiedDate', 'Enter the identification date.');
  else if (!isRealDate(values.identifiedDate)) set('identifiedDate', 'Enter a valid date.');
  else if (values.identifiedDate > today)
    set('identifiedDate', 'Identification date cannot be in the future.');
  else if (values.identifiedDate < EARLIEST_DATE)
    set('identifiedDate', 'Enter a date after 01/01/1900.');

  if (values.notes.length > NOTES_MAX_LENGTH)
    set('notes', `Notes cannot be longer than ${NOTES_MAX_LENGTH} characters.`);

  return errors;
}

/* Legal heir KYC (demo) -------------------------------------------------- */

const AADHAAR_PATTERN = /^[0-9]{12}$/;

export const KYC_FIELD_ORDER = ['fullName', 'dateOfBirth', 'mobile', 'pan', 'aadhaar'];

/**
 * Validates the demo KYC form. These are format checks only — nothing is
 * looked up or verified against any real record.
 */
export function validateKyc(values, today) {
  const errors = {};
  const set = (key, message) => {
    if (message) errors[key] = message;
  };

  set('fullName', personName(values.fullName, 'your full name'));

  if (!values.dateOfBirth) set('dateOfBirth', 'Enter your date of birth.');
  else if (!isRealDate(values.dateOfBirth)) set('dateOfBirth', 'Enter a valid date.');
  else if (values.dateOfBirth > today) set('dateOfBirth', 'Date of birth cannot be in the future.');
  else if (values.dateOfBirth < EARLIEST_DATE) set('dateOfBirth', 'Enter a date after 01/01/1900.');

  if (!values.mobile.trim()) set('mobile', 'Enter your mobile number.');
  else if (!MOBILE_PATTERN.test(normalisePhone(values.mobile)))
    set('mobile', 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.');

  const pan = values.pan.trim().toUpperCase();
  if (!pan) set('pan', 'Enter your PAN number.');
  else if (!PAN_PATTERN.test(pan)) set('pan', 'PAN must be 10 characters in the format ABCDE1234F.');

  const aadhaar = values.aadhaar.replace(/\s/g, '');
  if (!aadhaar) set('aadhaar', 'Enter your Aadhaar number.');
  else if (!AADHAAR_PATTERN.test(aadhaar)) set('aadhaar', 'Aadhaar number must be exactly 12 digits.');

  return errors;
}
