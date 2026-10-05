/**
 * Insurance policy mock data — FICTIONAL demo records only.
 *
 * LegacyTrack does not connect to any insurer, regulator or government system.
 * These are records a family would enter themselves. Policy numbers are stored
 * masked (last four digits only), so a full number never exists in the app.
 *
 * Shape (mirrors the future `insurance_policies` API resource):
 * {
 *   id, caseId, claimId, insuranceCompany, policyType, maskedPolicyNumber,
 *   claimAmount, assetReference, assetStatus, identifiedDate, lastUpdated, notes
 * }
 *
 * Claim state (status, stage, documents) lives in ./claims.js and is joined
 * on by the service layer through `claimId`.
 */
export const insurancePolicies = [
  {
    id: 'ins-001',
    caseId: 'dp-001',
    claimId: 'CLM-INS-0001',
    insuranceCompany: 'LIC',
    policyType: 'Life Insurance',
    maskedPolicyNumber: 'XXXX4582',
    claimAmount: 500000,
    assetReference: 'AST-INS-0001',
    assetStatus: 'Asset Identified',
    identifiedDate: '2026-09-06',
    lastUpdated: '2026-09-30',
    notes: 'Policy bond found in the bank locker. Applicant is the registered nominee.',
  },
  {
    id: 'ins-002',
    caseId: 'dp-001',
    claimId: 'CLM-INS-0002',
    insuranceCompany: 'HDFC Life',
    policyType: 'Term Insurance',
    maskedPolicyNumber: 'XXXX7316',
    claimAmount: 300000,
    assetReference: 'AST-INS-0002',
    assetStatus: 'Documents Required',
    identifiedDate: '2026-09-18',
    lastUpdated: '2026-09-25',
    notes: 'Identified from premium debits in the bank statement. Original policy document not yet found.',
  },
  {
    id: 'ins-003',
    caseId: 'dp-001',
    claimId: 'CLM-INS-0003',
    insuranceCompany: 'SBI Life',
    policyType: 'Endowment Plan',
    maskedPolicyNumber: 'XXXX2059',
    claimAmount: 200000,
    assetReference: 'AST-INS-0003',
    assetStatus: 'Documents Collected',
    identifiedDate: '2026-09-07',
    lastUpdated: '2026-10-02',
    notes: '',
  },
  {
    id: 'ins-004',
    caseId: 'dp-001',
    claimId: 'CLM-INS-0004',
    insuranceCompany: 'ICICI Prudential Life',
    policyType: 'Personal Accident Cover',
    maskedPolicyNumber: 'XXXX8840',
    claimAmount: 100000,
    assetReference: 'AST-INS-0004',
    assetStatus: 'Settlement Completed',
    identifiedDate: '2026-09-04',
    lastUpdated: '2026-09-27',
    notes: 'Group cover linked to a credit card. Settled to the nominee.',
  },
];
