/**
 * Bank account mock data — FICTIONAL demo records only.
 *
 * LegacyTrack does not connect to any bank or government system. These are
 * records a family would enter themselves. Account numbers are stored masked
 * (last four digits only), so a full number never exists in the app.
 *
 * Shape (mirrors the future `bank_accounts` API resource):
 * {
 *   id, caseId, claimId, bankName, accountType, maskedAccountNumber,
 *   estimatedAmount, assetReference, assetStatus, identifiedDate,
 *   lastUpdated, notes
 * }
 *
 * Claim state (status, stage, documents) lives in ./claims.js and is joined
 * on by the service layer through `claimId`.
 */
export const bankAccounts = [
  {
    id: 'bank-001',
    caseId: 'dp-001',
    claimId: 'CLM-BNK-0001',
    bankName: 'SBI',
    accountType: 'Savings Account',
    maskedAccountNumber: 'XXXX XXXX 4521',
    estimatedAmount: 245000,
    assetReference: 'AST-BNK-0001',
    assetStatus: 'Asset Identified',
    identifiedDate: '2026-09-05',
    lastUpdated: '2026-10-01',
    notes: 'Primary salary and pension account. Passbook found at home.',
  },
  {
    id: 'bank-002',
    caseId: 'dp-001',
    claimId: 'CLM-BNK-0002',
    bankName: 'HDFC Bank',
    accountType: 'Fixed Deposit',
    maskedAccountNumber: 'XXXX XXXX 7812',
    estimatedAmount: 150000,
    assetReference: 'AST-BNK-0002',
    assetStatus: 'Documents Required',
    identifiedDate: '2026-09-20',
    lastUpdated: '2026-09-27',
    notes: 'Deposit receipt found with household papers. Maturity value to be confirmed.',
  },
  {
    id: 'bank-003',
    caseId: 'dp-001',
    claimId: 'CLM-BNK-0003',
    bankName: 'Axis Bank',
    accountType: 'Current Account',
    maskedAccountNumber: 'XXXX XXXX 3098',
    estimatedAmount: 62500,
    assetReference: 'AST-BNK-0003',
    assetStatus: 'Documents Collected',
    identifiedDate: '2026-09-08',
    lastUpdated: '2026-09-30',
    notes: '',
  },
  {
    id: 'bank-004',
    caseId: 'dp-001',
    claimId: 'CLM-BNK-0004',
    bankName: 'Punjab National Bank',
    accountType: 'Savings Account',
    maskedAccountNumber: 'XXXX XXXX 6634',
    estimatedAmount: 38200,
    assetReference: 'AST-BNK-0004',
    assetStatus: 'Settlement Completed',
    identifiedDate: '2026-09-04',
    lastUpdated: '2026-09-29',
    notes: 'Small-balance account with a registered nominee. Settled to the nominee.',
  },
];
