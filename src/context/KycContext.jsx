import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * Legal heir KYC state for the current demo session.
 *
 * DEMONSTRATION ONLY. "Verified" here means the simulated check in this
 * prototype was completed — no identity is checked against UIDAI, the Income
 * Tax Department or any KYC service. Only masked values are kept, in
 * sessionStorage, so a refresh keeps the state and closing the tab clears it.
 * Signing out, or "Reset demo data", also clears it.
 *
 * To add real KYC later, replace `verifyKyc` in services/api.js with the
 * provider call and have the backend return this same record shape.
 */
const STORAGE_KEY = 'legacytrack.kyc';
const KycContext = createContext(null);

function readKyc() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.verified ? parsed : null;
  } catch {
    return null;
  }
}

export function KycProvider({ children }) {
  const { user } = useAuth();
  const [record, setRecord] = useState(readKyc);

  /** Stores the (already masked) record returned by the simulated verification. */
  const markVerified = useCallback((verifiedRecord) => {
    const next = { ...verifiedRecord, verified: true };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable — verified for this page load only */
    }
    setRecord(next);
  }, []);

  const resetKyc = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setRecord(null);
  }, []);

  // KYC belongs to a signed-in session: signing out clears it.
  useEffect(() => {
    if (!user) resetKyc();
  }, [user, resetKyc]);

  const value = useMemo(
    () => ({ isVerified: Boolean(record), record, markVerified, resetKyc }),
    [record, markVerified, resetKyc],
  );
  return <KycContext.Provider value={value}>{children}</KycContext.Provider>;
}

export function useKyc() {
  const ctx = useContext(KycContext);
  if (!ctx) throw new Error('useKyc must be used inside <KycProvider>');
  return ctx;
}
