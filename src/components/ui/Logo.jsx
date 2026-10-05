/**
 * LegacyTrack brand mark + wordmark.
 * `tone="light"` is for dark backgrounds (sidebar, login panel).
 */
export default function Logo({ tone = 'dark', showTagline = false }) {
  return (
    <div className={`logo logo--${tone}`}>
      <svg className="logo__mark" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--brand-600)" />
        <path
          d="M11 8v15h11"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="21.500" cy="11.500" r="2.500" fill="var(--gold-400)" />
      </svg>
      <div className="logo__text">
        <span className="logo__name">
          Legacy<span>Track</span>
        </span>
        {showTagline && (
          <span className="logo__tagline">Simplifying Financial Legacy Management.</span>
        )}
      </div>
    </div>
  );
}
