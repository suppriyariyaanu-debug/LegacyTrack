import { CLAIM_STAGES } from '../../data/mockData';

/**
 * Compact six-step progress indicator for a claim.
 * (The full vertical timeline arrives with the Claim Tracker in Phase 6.)
 */
export default function ClaimProgress({ stage }) {
  const current = CLAIM_STAGES.findIndex((s) => s.id === stage);
  const label = CLAIM_STAGES[current]?.label ?? 'Not started';
  // A settled claim has no stage still in progress, so the whole bar reads as done.
  const isComplete = current === CLAIM_STAGES.length - 1;

  return (
    <div className="claim-progress">
      <div
        className="claim-progress__track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={CLAIM_STAGES.length}
        aria-valuenow={current + 1}
        aria-valuetext={`Step ${current + 1} of ${CLAIM_STAGES.length}: ${label}`}
      >
        {CLAIM_STAGES.map((s, i) => (
          <span
            key={s.id}
            className={
              'claim-progress__step' +
              (i < current || (i === current && isComplete) ? ' is-done' : '') +
              (i === current && !isComplete ? ' is-current' : '')
            }
          />
        ))}
      </div>
      <span className="claim-progress__label">
        Step {current + 1} of {CLAIM_STAGES.length}
      </span>
    </div>
  );
}
