/**
 * LegacyTrack mock data
 * ---------------------------------------------------------------------------
 * Everything in this file is FICTIONAL demo data. No real person, account,
 * policy or institution record is represented. Account and policy numbers are
 * stored already-masked so an unmasked value never exists in the frontend.
 *
 * The shapes below are intended to mirror what a future Spring Boot + MySQL
 * backend would return, so swapping the service layer later needs no UI change.
 */

/** The six canonical stages every claim moves through, in order. */
export const CLAIM_STAGES = [
  { id: 'IDENTIFIED', label: 'Asset Identified' },
  { id: 'DOCUMENTS', label: 'Documents Collected' },
  { id: 'SUBMITTED', label: 'Claim Submitted' },
  { id: 'VERIFICATION', label: 'Verification in Progress' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'SETTLED', label: 'Settlement Completed' },
];

export const demoUser = {
  id: 'usr-001',
  name: 'Anita Kumar',
  email: 'anita.kumar@example.com',
  relationship: 'Daughter · Legal heir',
  initials: 'AK',
};

export const deceasedPersons = [
  {
    id: 'dp-001',
    caseRef: 'LT-2026-00148',
    name: 'Rajesh Kumar',
    dateOfBirth: '1960-06-15',
    dateOfDeath: '2026-08-20',
    gender: 'Male',
    maskedPan: 'XXXXXX234F',
    address: '14, Shanti Niketan Society, Karve Road',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411004',
    applicant: {
      name: 'Anita Kumar',
      relationship: 'Daughter',
      maskedPhone: '+91 XXXXXX3210',
      email: 'anita.kumar@example.com',
    },
    registeredOn: '2026-09-02',
    updatedOn: '2026-10-01',
  },
];

export const recentActivity = [
  {
    id: 'act-001',
    kind: 'alert',
    title: 'Legal Heir Certificate is required for HDFC Bank FD claim.',
    date: '2026-10-01',
  },
  {
    id: 'act-002',
    kind: 'progress',
    title: 'LIC Life Insurance claim was initiated.',
    date: '2026-09-30',
  },
  {
    id: 'act-003',
    kind: 'upload',
    title: 'Identity Proof was uploaded.',
    date: '2026-09-28',
  },
  {
    id: 'act-004',
    kind: 'verified',
    title: 'Death Certificate was verified.',
    date: '2026-09-24',
  },
  {
    id: 'act-005',
    kind: 'progress',
    title: 'HDFC Bank Fixed Deposit was added to the asset register.',
    date: '2026-09-20',
  },
];
