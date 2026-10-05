/**
 * In-browser demo store.
 *
 * Holds the records that can change during a demo (registered deceased
 * persons and their documents). It is seeded from mockData.js and kept in
 * sessionStorage, so a page refresh keeps what was registered and closing the
 * tab resets the demo.
 *
 * Only src/services/api.js talks to this file. When a backend exists this
 * whole file goes away.
 */
import { bankAccounts as seedBankAccounts } from './bankAccounts';
import { claims as seedClaims } from './claims';
import { insurancePolicies as seedInsurancePolicies } from './insurancePolicies';
import { documents as seedDocuments } from './documents';
import { deceasedPersons, recentActivity as seedActivity } from './mockData';
import { notifications as seedNotifications } from './notifications';

const STORAGE_KEY = 'legacytrack.store.v6';

function seed() {
  return {
    persons: structuredClone(deceasedPersons),
    // one flat list: case documents and claim documents alike
    documents: structuredClone(seedDocuments),
    bankAccounts: structuredClone(seedBankAccounts),
    insurancePolicies: structuredClone(seedInsurancePolicies),
    claims: structuredClone(seedClaims),
    notifications: structuredClone(seedNotifications),
    // activity log, oldest first (the seed list is written newest first)
    activity: structuredClone(seedActivity)
      .reverse()
      .map((entry) => ({ ...entry, caseId: 'dp-001' })),
    preferences: { emailNotifications: true, claimAlerts: true, documentAlerts: true },
    sequence: 100,
  };
}

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed?.persons) &&
        Array.isArray(parsed.documents) &&
        Array.isArray(parsed.bankAccounts) &&
        Array.isArray(parsed.insurancePolicies) &&
        Array.isArray(parsed.claims) &&
        Array.isArray(parsed.notifications) &&
        Array.isArray(parsed.activity) &&
        parsed.preferences
      )
        return parsed;
    }
  } catch {
    /* fall through to a fresh seed */
  }
  return seed();
}

let state = load();

const listeners = new Set();

function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — data lasts for this page load only */
  }
  listeners.forEach((listener) => listener());
}

export const store = {
  getPersons: () => state.persons,
  getPerson: (id) => state.persons.find((p) => p.id === id) ?? null,

  addPerson(person) {
    state.persons.push(person);
    persist();
  },

  updatePerson(id, changes) {
    const person = store.getPerson(id);
    if (person) Object.assign(person, changes);
    persist();
  },

  /* Documents (central store: case, bank-claim and insurance-claim documents) */
  getDocuments: (caseId) => state.documents.filter((d) => d.caseId === caseId),
  getDocument: (id) => state.documents.find((d) => d.id === id) ?? null,

  addDocument(document) {
    state.documents.push(document);
    persist();
  },

  /** Applies `mutate(document)` to one document and saves. */
  updateDocument(id, mutate) {
    const document = store.getDocument(id);
    if (document) mutate(document);
    persist();
    return document;
  },

  /* Bank accounts */
  getAllBankAccounts: () => state.bankAccounts,
  getBankAccounts: (caseId) => state.bankAccounts.filter((a) => a.caseId === caseId),
  getBankAccount: (id) => state.bankAccounts.find((a) => a.id === id) ?? null,

  addBankAccount(account) {
    state.bankAccounts.push(account);
    persist();
  },

  /** Applies `mutate(account)` to one bank account and saves. */
  updateBankAccount(id, mutate) {
    const account = store.getBankAccount(id);
    if (account) mutate(account);
    persist();
    return account;
  },

  /* Insurance policies */
  getAllInsurancePolicies: () => state.insurancePolicies,
  getInsurancePolicies: (caseId) => state.insurancePolicies.filter((p) => p.caseId === caseId),
  getInsurancePolicy: (id) => state.insurancePolicies.find((p) => p.id === id) ?? null,

  addInsurancePolicy(policy) {
    state.insurancePolicies.push(policy);
    persist();
  },

  /** Applies `mutate(policy)` to one insurance policy and saves. */
  updateInsurancePolicy(id, mutate) {
    const policy = store.getInsurancePolicy(id);
    if (policy) mutate(policy);
    persist();
    return policy;
  },

  /* Claims (central claim state for bank accounts and insurance policies) */
  getAllClaims: () => state.claims,
  getClaims: (caseId) => state.claims.filter((c) => c.caseId === caseId),
  getClaim: (id) => state.claims.find((c) => c.id === id) ?? null,

  addClaim(claim) {
    state.claims.push(claim);
    persist();
  },

  /** Applies `mutate(claim)` to one claim and saves. */
  updateClaim(id, mutate) {
    const claim = store.getClaim(id);
    if (claim) mutate(claim);
    persist();
    return claim;
  },

  /* Notifications */
  getNotifications: (caseId) => state.notifications.filter((n) => n.caseId === caseId),
  getNotification: (id) => state.notifications.find((n) => n.id === id) ?? null,

  addNotification(notification) {
    state.notifications.push(notification);
    persist();
  },

  updateNotifications(match, changes) {
    state.notifications.filter(match).forEach((n) => Object.assign(n, changes));
    persist();
  },

  removeNotifications(match) {
    state.notifications = state.notifications.filter((n) => !match(n));
    persist();
  },

  /* Activity log (shown as "Recent activity") */
  getActivity: (caseId) => state.activity.filter((a) => a.caseId === caseId),

  addActivity(entry) {
    state.activity.push(entry);
    persist();
  },

  /* Demo preferences */
  getPreferences: () => state.preferences,

  setPreference(key, value) {
    state.preferences[key] = value;
    persist();
  },

  /** A number that is unique for this demo session; used to build ids. */
  nextSequence() {
    state.sequence += 1;
    return state.sequence;
  },

  /** Calls `listener` after every change. Returns a function that stops it. */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Restores the original demo data. */
  reset() {
    state = seed();
    persist();
  },
};
