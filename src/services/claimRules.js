/**
 * Claim rules — the one place that decides how a claim behaves, for bank and
 * insurance claims alike. Pure functions only: no storage, no network, so the
 * same rules can move to (or be mirrored by) a backend later.
 *
 * Nothing here contacts a bank, insurer or government system. "Submitting" a
 * claim only changes the record kept inside LegacyTrack.
 */
import { CLAIM_STAGES } from '../data/mockData';

export const PRE_SUBMISSION_STAGES = ['IDENTIFIED', 'DOCUMENTS'];
const REVIEW_STAGES = ['SUBMITTED', 'VERIFICATION'];

export const ASSET_TYPE_LABELS = { BANK: 'Bank', INSURANCE: 'Insurance' };

/** A document that still has to be provided. */
export const isOutstanding = (doc) => doc.status === 'Required' || doc.status === 'Pending';

export const outstandingDocuments = (claim) => claim.documents.filter(isOutstanding);

export const isPreSubmission = (claim) => PRE_SUBMISSION_STAGES.includes(claim.currentStage);

/** Status wording once a claim is filed: banks say "submitted", insurers "initiated". */
export const submittedStatusFor = (assetType) =>
  assetType === 'INSURANCE' ? 'Claim Initiated' : 'Claim Submitted';

/** A claim can be submitted once every document is in and it has not been filed yet. */
export const canSubmit = (claim) => isPreSubmission(claim) && outstandingDocuments(claim).length === 0;

/**
 * Stage name to show. While documents are still being gathered the
 * "Documents Collected" stage reads as "Documents Required".
 */
export function stageLabel(claim) {
  if (claim.currentStage === 'DOCUMENTS' && outstandingDocuments(claim).length > 0) {
    return 'Documents Required';
  }
  return CLAIM_STAGES.find((s) => s.id === claim.currentStage)?.label ?? '—';
}

/** Dates and notes for <ClaimTimeline>. */
export function timelineDetails(claim) {
  const missing = outstandingDocuments(claim).length;
  const notes = {};
  if (claim.currentStage === 'DOCUMENTS') {
    notes.DOCUMENTS =
      missing > 0
        ? `Documents Required — ${missing} still needed before the claim can be submitted.`
        : 'All documents collected. This claim is ready to submit.';
  }
  return {
    dates: {
      IDENTIFIED: claim.createdDate,
      SUBMITTED: claim.submittedDate,
      SETTLED: claim.settledDate,
    },
    notes,
  };
}

/**
 * The next step to offer for a claim.
 * kind: 'DOCUMENTS' | 'SUBMIT' | 'STATUS' | 'SETTLEMENT'
 */
export function claimAction(claim) {
  const missing = outstandingDocuments(claim).length;

  if (isPreSubmission(claim)) {
    if (missing > 0) {
      return {
        kind: 'DOCUMENTS',
        label: 'View Required Documents',
        tone: 'warning',
        title: missing === 1 ? '1 document is still required' : `${missing} documents are still required`,
        message: 'Upload the remaining documents before this claim can be submitted.',
      };
    }
    return {
      kind: 'SUBMIT',
      label: 'Submit Claim',
      tone: 'success',
      title: 'All required documents are collected',
      message: 'This claim is ready to be marked as submitted.',
    };
  }

  if (REVIEW_STAGES.includes(claim.currentStage)) {
    return {
      kind: 'STATUS',
      label: 'View Claim Status',
      tone: 'info',
      title:
        claim.currentStage === 'VERIFICATION'
          ? 'This claim is in verification'
          : 'This claim is recorded as submitted',
      message:
        missing > 0
          ? `${missing} supporting ${missing === 1 ? 'document is' : 'documents are'} still outstanding. Follow the progress below.`
          : 'Follow the progress of this claim in the timeline below.',
    };
  }

  return {
    kind: 'SETTLEMENT',
    label: 'View Settlement Details',
    tone: 'success',
    title: claim.currentStage === 'SETTLED' ? 'This claim is settled' : 'This claim is approved',
    message:
      claim.currentStage === 'SETTLED'
        ? 'The settlement has been recorded for this claim.'
        : 'Settlement is awaited. Details are shown below.',
  };
}

/**
 * Headline numbers for a set of claims.
 * "Pending" means not yet settled, as on the Dashboard and asset pages.
 */
export function summariseClaims(claims) {
  const at = (stage) => claims.filter((c) => c.currentStage === stage).length;
  const needingDocuments = claims.filter((c) => outstandingDocuments(c).length > 0);
  return {
    total: claims.length,
    pending: claims.length - at('SETTLED'),
    inVerification: at('VERIFICATION'),
    approved: at('APPROVED'),
    settled: at('SETTLED'),
    documentsRequired: needingDocuments.reduce((sum, c) => sum + outstandingDocuments(c).length, 0),
    claimsNeedingDocuments: needingDocuments.length,
    totalAmount: claims.reduce((sum, c) => sum + c.claimAmount, 0),
  };
}
