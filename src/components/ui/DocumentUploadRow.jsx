import { useState } from 'react';
import { formatFileSize } from '../../utils/format';
import Icon from './Icon';
import StatusBadge from './StatusBadge';
import UploadButton from './UploadButton';

/**
 * One document line in a form: name, hint or chosen file, status, upload/remove.
 * `file` is `{ fileName, size }` or null. Upload is simulated (see UploadButton).
 */
export default function DocumentUploadRow({ id, name, hint, required, file, error, onChange }) {
  const [fileError, setFileError] = useState(null);
  const message = fileError ?? error;
  const status = file ? 'Uploaded' : required ? 'Required' : 'Pending';

  return (
    <li className={`upload-row${message ? ' has-error' : ''}`}>
      <span className="upload-row__icon">
        <Icon name="file" size={18} />
      </span>

      <div className="upload-row__body">
        <p className="upload-row__name">
          {name}
          {required ? (
            <span className="form-field__required" aria-hidden="true">
              {' '}
              *
            </span>
          ) : (
            <span className="form-field__optional"> (optional)</span>
          )}
        </p>
        {file ? (
          <p className="upload-row__file">
            {file.fileName} · {formatFileSize(file.size)}
          </p>
        ) : (
          <p className="upload-row__hint">{hint}</p>
        )}
        {message && (
          <p className="form-field__error" id={`${id}-error`}>
            <Icon name="alert" size={13} /> {message}
          </p>
        )}
      </div>

      <div className="upload-row__actions">
        <StatusBadge status={status} />
        <UploadButton
          id={id}
          label={file ? 'Replace' : 'Upload'}
          invalid={Boolean(message)}
          describedBy={message ? `${id}-error` : undefined}
          onFile={(picked) => onChange(picked)}
          onError={setFileError}
        />
        {file && (
          <button
            type="button"
            className="icon-btn icon-btn--sm"
            aria-label={`Remove ${name}`}
            onClick={() => onChange(null)}
          >
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>
    </li>
  );
}
