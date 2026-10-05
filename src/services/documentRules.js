/**
 * Document rules — pure helpers shared by the Documents pages and the
 * Dashboard. No storage and no network.
 *
 * Status meanings:
 *   Required  not uploaded yet
 *   Pending   asked for, not uploaded yet (treated as outstanding, like Required)
 *   Uploaded  a file has been recorded but not verified
 *   Verified  marked as verified inside LegacyTrack (a demo action — no bank,
 *             insurer or government body verifies anything)
 */
import { isOutstanding } from './claimRules';

export { isOutstanding };

export const DOCUMENT_CATEGORIES = [
  {
    id: 'CASE',
    label: 'Case',
    title: 'Case Documents',
    description: 'Held once for the case and shared by every claim that needs them.',
    icon: 'user',
  },
  {
    id: 'BANK_CLAIM',
    label: 'Bank claim',
    title: 'Bank Claim Documents',
    description: 'Required for a specific bank claim.',
    icon: 'bank',
  },
  {
    id: 'INSURANCE_CLAIM',
    label: 'Insurance claim',
    title: 'Insurance Claim Documents',
    description: 'Required for a specific insurance claim.',
    icon: 'shield',
  },
];

export const DOCUMENT_STATUSES = ['Required', 'Pending', 'Uploaded', 'Verified'];

export const categoryFor = (id) => DOCUMENT_CATEGORIES.find((c) => c.id === id);

/** An uploaded document can be marked as verified; nothing else can. */
export const canVerify = (doc) => doc.status === 'Uploaded';

/** True when a file has been recorded for the document. */
export const hasFile = (doc) => Boolean(doc.fileName);

/** Does this document relate to a bank / insurance asset (directly, or through a claim sharing it)? */
export const relatesToAssetType = (doc, assetType) =>
  doc.relatedAssetType === assetType ||
  (doc.relatedClaims ?? []).some((claim) => claim.assetType === assetType);

/** Headline numbers. `required` counts everything still outstanding (Required + Pending). */
export function summariseDocuments(documents) {
  const count = (status) => documents.filter((d) => d.status === status).length;
  return {
    total: documents.length,
    uploaded: count('Uploaded'),
    verified: count('Verified'),
    required: documents.filter(isOutstanding).length,
    pending: count('Pending'),
  };
}
