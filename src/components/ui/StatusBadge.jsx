/**
 * One badge for every status in the app (assets, claims, documents).
 * The label is always shown as text, so colour is never the only signal.
 */
const TONES = {
  // asset / claim statuses
  'Asset Identified': 'neutral',
  'Documents Required': 'warning',
  'Documents Collected': 'progress',
  'Claim Pending': 'info',
  'Claim Initiated': 'info',
  'Claim Submitted': 'info',
  'Verification in Progress': 'progress',
  Approved: 'success',
  'Settlement Completed': 'success',
  'Amount Settled': 'success',
  // document statuses
  Uploaded: 'info',
  Pending: 'neutral',
  Required: 'warning',
  Verified: 'success',
  // notification priorities
  'High priority': 'warning',
  Information: 'info',
  Success: 'success',
  // case statuses
  'Active case': 'success',
  Registered: 'info',
};

export default function StatusBadge({ status }) {
  const tone = TONES[status] ?? 'neutral';
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {status}
    </span>
  );
}
