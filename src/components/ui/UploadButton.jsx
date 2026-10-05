import { useEffect, useRef, useState } from 'react';
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from '../../data/constants';
import Icon from './Icon';

const ALLOWED_EXTENSIONS = UPLOAD_ACCEPT.split(',');
const SIMULATED_UPLOAD_MS = 900;

/**
 * SIMULATED upload. The user picks a file so the flow feels real, but only the
 * file's name and size are kept — the contents are never read, stored or sent
 * anywhere. Replace `onFile` handling with a real multipart upload later.
 *
 * onFile({ fileName, size }) may return a promise; the button stays busy until
 * it settles. onError(message) reports a rejected file (wrong type / too big).
 */
export default function UploadButton({
  id,
  label = 'Upload',
  describedBy,
  invalid = false,
  onFile,
  onError,
}) {
  const inputRef = useRef(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;

    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      onError?.('Choose a PDF, JPG or PNG file.');
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      onError?.('File is larger than 5 MB. Choose a smaller file.');
      return;
    }

    onError?.(null);
    setBusy(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, SIMULATED_UPLOAD_MS));
      await onFile({ fileName: file.name, size: file.size });
    } catch {
      onError?.('Upload failed. Please try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={UPLOAD_ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <button
        id={id}
        type="button"
        className="btn btn--secondary btn--sm"
        disabled={busy}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="upload" size={14} />
        {busy ? 'Uploading…' : label}
      </button>
    </>
  );
}
