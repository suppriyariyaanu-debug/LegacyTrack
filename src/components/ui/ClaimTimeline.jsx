import { CLAIM_STAGES } from '../../data/mockData';
import { formatDateShort } from '../../utils/format';
import Icon from './Icon';

/**
 * Vertical six-stage claim timeline. Uses the same colours as ClaimProgress:
 * teal for completed stages, gold for the current one, grey for what is ahead.
 *
 * `stage`  — id of the stage the claim is currently at
 * `dates`  — optional { STAGE_ID: 'YYYY-MM-DD' } shown beside a stage
 * `notes`  — optional { STAGE_ID: 'text' } shown under a stage
 */
export default function ClaimTimeline({ stage, dates = {}, notes = {} }) {
  const current = CLAIM_STAGES.findIndex((s) => s.id === stage);
  const isComplete = current === CLAIM_STAGES.length - 1;

  return (
    <ol className="timeline">
      {CLAIM_STAGES.map((s, index) => {
        const done = index < current || (isComplete && index === current);
        const isCurrent = index === current && !isComplete;
        const state = done ? 'done' : isCurrent ? 'current' : 'upcoming';

        return (
          <li
            key={s.id}
            className={`timeline__step is-${state}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span className="timeline__marker" aria-hidden="true">
              {done ? <Icon name="tick" size={14} /> : index + 1}
            </span>
            <div className="timeline__body">
              <p className="timeline__label">
                {s.label}
                {isCurrent && <span className="timeline__tag">Current stage</span>}
                <span className="sr-only">
                  {done ? ' (completed)' : isCurrent ? '' : ' (not started)'}
                </span>
              </p>
              {dates[s.id] && <p className="timeline__meta">{formatDateShort(dates[s.id])}</p>}
              {notes[s.id] && <p className="timeline__note">{notes[s.id]}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
