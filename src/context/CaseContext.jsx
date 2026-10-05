import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDeceasedPerson } from '../services/api';

/**
 * Tracks which deceased person's case the user is currently working on.
 * Every case-scoped page (Dashboard, assets, claims, documents, notifications,
 * search) shows data for the active case only.
 */
const STORAGE_KEY = 'legacytrack.activeCase';
export const DEFAULT_CASE_ID = 'dp-001';
const CaseContext = createContext(null);

function readActiveId() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || DEFAULT_CASE_ID;
  } catch {
    return DEFAULT_CASE_ID;
  }
}

export function CaseProvider({ children }) {
  const [activeId, setActive] = useState(readActiveId);

  const setActiveId = useCallback((id) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setActive(id);
  }, []);

  // If the remembered case no longer exists (for example after the demo data
  // was reset), fall back to the default case instead of showing an error.
  useEffect(() => {
    if (activeId === DEFAULT_CASE_ID) return undefined;
    let cancelled = false;
    getDeceasedPerson(activeId).catch((error) => {
      if (!cancelled && error?.code === 'NOT_FOUND') setActiveId(DEFAULT_CASE_ID);
    });
    return () => {
      cancelled = true;
    };
  }, [activeId, setActiveId]);

  const value = useMemo(() => ({ activeId, setActiveId }), [activeId, setActiveId]);
  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useActiveCase() {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useActiveCase must be used inside <CaseProvider>');
  return ctx;
}
