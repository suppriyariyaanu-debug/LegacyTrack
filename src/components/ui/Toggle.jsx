/** On / off switch. The state is also written out as text, so colour is not the only cue. */
export default function Toggle({ id, checked, onChange, label, description, disabled = false }) {
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <p className="toggle-row__label" id={`${id}-label`}>
          {label}
        </p>
        {description && (
          <p className="toggle-row__description" id={`${id}-description`}>
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={`toggle${checked ? ' is-on' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle__track" aria-hidden="true">
          <span className="toggle__thumb" />
        </span>
        <span className="toggle__state">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}
