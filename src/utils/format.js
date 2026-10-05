const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** 245000 -> "₹2,45,000" (Indian digit grouping) */
export function formatCurrency(amount) {
  return inr.format(amount);
}

/** "2026-08-20" -> "20/08/2026" */
export function formatDate(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** "2026-10-01" -> "1 Oct 2026" */
export function formatDateShort(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Age in whole years between two ISO dates. */
export function yearsBetween(fromIso, toIso) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  let years = to.getFullYear() - from.getFullYear();
  const beforeBirthday =
    to.getMonth() < from.getMonth() ||
    (to.getMonth() === from.getMonth() && to.getDate() < from.getDate());
  if (beforeBirthday) years -= 1;
  return years;
}

/** Today's date in the user's timezone as "YYYY-MM-DD". */
export function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 248000 -> "242 KB" */
export function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Now, in the user's timezone, as "YYYY-MM-DDTHH:mm". */
export function nowIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${todayIso()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** "2026-10-01T09:30" -> "1 Oct 2026, 9:30 am" */
export function formatDateTime(iso) {
  const [date, time = '00:00'] = iso.split('T');
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatDateShort(date)}, ${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}
