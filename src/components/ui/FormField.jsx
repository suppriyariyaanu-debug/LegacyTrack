import Icon from './Icon';

/**
 * Label + control + hint/error wrapper.
 * The control (input/select/textarea) is passed as children and should use
 * the same `id`, plus aria-describedby={`${id}-error`} when there is an error.
 */
export default function FormField({ id, label, required = false, error, hint, wide = false, children }) {
  return (
    <div className={`form-field${wide ? ' form-field--wide' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required ? (
          <span className="form-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        ) : (
          <span className="form-field__optional"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p className="form-field__error" id={`${id}-error`}>
          <Icon name="alert" size={13} /> {error}
        </p>
      ) : (
        hint && (
          <p className="form-field__hint" id={`${id}-hint`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}
