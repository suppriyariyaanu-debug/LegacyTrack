/**
 * Small in-house icon set (stroke icons on a 24px grid) so the prototype has
 * no icon-library dependency. Usage: <Icon name="bank" size={18} />
 */
const PATHS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="8" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="5" rx="1.5" />
      <rect x="13.5" y="12.5" width="7" height="8" rx="1.5" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.200 2 7 5.500" />
    </>
  ),
  bank: <path d="M3 10l9-6 9 6M5 10v8M9.500 10v8M14.500 10v8M19 10v8M3 20.500h18" />,
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.500-3.200 8-8 9-4.800-1-8-4.500-8-9V6l8-3z" />
      <path d="M9 12l2.200 2.200L15 10.500" />
    </>
  ),
  claims: (
    <>
      <circle cx="5" cy="6" r="1.600" />
      <circle cx="5" cy="12" r="1.600" />
      <circle cx="5" cy="18" r="1.600" />
      <path d="M10 6h10M10 12h10M10 18h10" />
    </>
  ),
  file: <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4" />,
  bell: <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.500 2.500h-15L6 16zM10 20.500a2 2 0 0 0 4 0" />,
  settings: (
    <>
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.500" />
      <circle cx="8" cy="17" r="2.500" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.500" />
      <path d="M20 20l-4.200-4.200" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4" />,
  wallet: (
    <path d="M4 7a2 2 0 0 1 2-2h11v4M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6a2 2 0 0 1-2-2zM16 14h.010" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 7.500V12l3 2" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M8.500 12.300l2.400 2.400 4.600-5" />
    </>
  ),
  alert: <path d="M12 4l9 16H3l9-16zM12 10v4.500M12 17.200h.010" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  upload: <path d="M12 16V5M7.500 9.500L12 5l4.500 4.500M5 19h14" />,
  mail: (
    <>
      <rect x="3.500" y="5.500" width="17" height="13" rx="2" />
      <path d="M4 7.500l8 6 8-6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9.500" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.500" />
      <path d="M12 11v5M12 8h.010" />
    </>
  ),
  back: <path d="M15 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <path d="M5 7h14M10 7V4.500h4V7M7 7l.800 12.500h8.400L17 7" />,
  tick: <path d="M6 12.500l4 4 8-9" />,
  circle: <circle cx="12" cy="12" r="8.500" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
};

export default function Icon({ name, size = 20, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.700"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name] ?? null}
    </svg>
  );
}
