/**
 * Masking helpers. Sensitive identifiers are masked before they are stored,
 * so the full value never sits in app state or browser storage.
 */

/** "ABCDE1234F" -> "XXXXXX234F" */
export function maskPan(pan) {
  const clean = pan.trim().toUpperCase();
  return `XXXXXX${clean.slice(-4)}`;
}

/** Strips spaces, dashes and an optional +91 / 91 / 0 prefix. */
export function normalisePhone(phone) {
  const digits = phone.replace(/[\s()-]/g, '');
  return digits.replace(/^(\+91|91|0)(?=\d{10}$)/, '');
}

/** "98765 43210" -> "+91 XXXXXX3210" */
export function maskPhone(phone) {
  return `+91 XXXXXX${normalisePhone(phone).slice(-4)}`;
}

/** "1234 5678 9012" -> "XXXX XXXX 9012" */
export function maskAadhaar(aadhaar) {
  return `XXXX XXXX ${aadhaar.replace(/\D/g, '').slice(-4)}`;
}
