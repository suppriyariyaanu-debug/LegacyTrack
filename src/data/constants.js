/** Fixed option lists used by forms. */

export const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export const RELATIONSHIPS = [
  'Spouse',
  'Son',
  'Daughter',
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandchild',
  'Other legal heir',
];

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

/** Documents collected when a deceased person is registered. */
export const REGISTRATION_DOCUMENTS = [
  {
    key: 'deathCertificate',
    name: 'Death Certificate',
    hint: 'Issued by the municipal or local registrar',
    required: true,
  },
  {
    key: 'identityProof',
    name: 'Identity Proof',
    hint: 'Any photo identity document of the deceased person',
    required: false,
  },
  {
    key: 'legalHeirCertificate',
    name: 'Legal Heir Certificate',
    hint: 'Or succession certificate, if already issued',
    required: false,
  },
  {
    key: 'nomineeProof',
    name: 'Nominee Proof',
    hint: 'Proof that the applicant is a registered nominee',
    required: false,
  },
];

/** Simulated upload limits. */
export const UPLOAD_ACCEPT = '.pdf,.jpg,.jpeg,.png';
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/* Bank accounts ---------------------------------------------------------- */

export const ACCOUNT_TYPES = [
  'Savings Account',
  'Current Account',
  'Fixed Deposit',
  'Recurring Deposit',
  'PPF Account',
];

export const ASSET_STATUSES = [
  'Asset Identified',
  'Documents Required',
  'Documents Collected',
  'Settlement Completed',
];

export const CLAIM_STATUSES = [
  'Pending',
  'Claim Submitted',
  'Verification in Progress',
  'Approved',
  'Settlement Completed',
];

/** Suggestions only — the bank name field accepts any name. */
export const BANK_SUGGESTIONS = [
  'SBI',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Kotak Mahindra Bank',
  'Union Bank of India',
  'Indian Bank',
];

/** Documents a bank claim normally needs; used when an account is added. */
export const BANK_CLAIM_DOCUMENTS = [
  'Death Certificate',
  'Identity Proof',
  'Legal Heir Certificate',
  'Bank Claim Form',
];

export const ACCOUNT_MASK_PREFIX = 'XXXX XXXX';

/* Insurance policies ----------------------------------------------------- */

export const POLICY_TYPES = [
  'Life Insurance',
  'Term Insurance',
  'Endowment Plan',
  'ULIP',
  'Health Insurance',
  'Personal Accident Cover',
];

export const INSURANCE_CLAIM_STATUSES = [
  'Pending',
  'Claim Initiated',
  'Verification in Progress',
  'Approved',
  'Settlement Completed',
];

/** Suggestions only — the insurance company field accepts any name. */
export const INSURER_SUGGESTIONS = [
  'LIC',
  'HDFC Life',
  'SBI Life',
  'ICICI Prudential Life',
  'Max Life',
  'Bajaj Allianz Life',
  'Tata AIA Life',
  'Kotak Life',
];

/** Documents an insurance claim normally needs; used when a policy is added. */
export const INSURANCE_CLAIM_DOCUMENTS = [
  'Death Certificate',
  'Identity Proof',
  'Legal Heir Certificate',
  'Insurance Claim Form',
  'Policy Document',
];

export const POLICY_MASK_PREFIX = 'XXXX';
