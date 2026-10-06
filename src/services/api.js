/**
 * Service layer — the ONLY place the UI gets data from.
 *
 * Today every function resolves from local mock data after a short simulated
 * delay. When a Spring Boot backend exists, replace each body with a fetch()
 * to the matching REST endpoint (noted beside each function). Pages and
 * components do not need to change.
 *
 * This prototype makes no network calls and has no connection to any bank,
 * insurer, or government system.
 */
import {
  ACCOUNT_MASK_PREFIX,
  BANK_CLAIM_DOCUMENTS,
  INSURANCE_CLAIM_DOCUMENTS,
  POLICY_MASK_PREFIX,
  REGISTRATION_DOCUMENTS,
} from '../data/constants';
import { store } from '../data/store';
import { nowIso, todayIso } from '../utils/format';
import { maskAadhaar, maskPan, maskPhone } from '../utils/mask';
import {
  canSubmit,
  isOutstanding,
  isPreSubmission,
  submittedStatusFor,
  summariseClaims,
} from './claimRules';
import { summariseDocuments } from './documentRules';

const READ_DELAY_MS = 450;
const WRITE_DELAY_MS = 700;

function respond(data, delay = READ_DELAY_MS) {
  return new Promise((resolve) => {
    // structuredClone keeps callers from mutating the shared store.
    setTimeout(() => resolve(structuredClone(data)), delay);
  });
}

function fail(message, code) {
  return new Promise((_, reject) => {
    const error = new Error(message);
    error.code = code;
    setTimeout(() => reject(error), READ_DELAY_MS);
  });
}

/* Events: activity log + notifications ----------------------------------- */

/**
 * Records something that happened in a case. `activity` adds a line to
 * "Recent activity"; `notification` adds an unread notification. Both are
 * generated here inside LegacyTrack — nothing is emailed, texted or pushed to
 * any external service.
 */
function recordEvent(caseId, { activity, notification }) {
  if (activity) {
    store.addActivity({
      id: `act-${store.nextSequence()}`,
      caseId,
      kind: activity.kind,
      title: activity.title,
      date: todayIso(),
    });
  }
  if (notification) {
    store.addNotification({
      id: `ntf-${store.nextSequence()}`,
      caseId,
      relatedLabel: null,
      href: null,
      requiredDocumentId: null,
      ...notification,
      timestamp: nowIso(),
      read: false,
    });
  }
}

/** Lets the app shell react to data changes (e.g. the unread count in the header). */
export function onDataChange(listener) {
  return store.subscribe(listener);
}

/* Deceased persons ------------------------------------------------------- */

/** Future: GET /api/deceased-persons */
export function getDeceasedPersons() {
  return respond(store.getPersons());
}

/** Future: GET /api/deceased-persons/:id */
export function getDeceasedPerson(id) {
  const person = store.getPerson(id);
  if (!person) return fail('Deceased person record not found.', 'NOT_FOUND');
  return respond(person);
}

/**
 * Future: POST /api/deceased-persons (multipart, with the document files)
 *
 * `values` are the validated registration form values and `files` maps each
 * registration document key to `{ fileName, size }` or null. Only masked PAN
 * and phone values are kept; the file contents are never read or stored.
 */
export function registerDeceasedPerson(values, files) {
  const today = todayIso();
  const sequence = store.getPersons().length + 1;
  const id = `dp-${String(sequence).padStart(3, '0')}`;

  const person = {
    id,
    caseRef: `LT-${today.slice(0, 4)}-${String(147 + sequence).padStart(5, '0')}`,
    name: values.fullName.trim(),
    dateOfBirth: values.dateOfBirth,
    dateOfDeath: values.dateOfDeath,
    gender: values.gender,
    maskedPan: values.pan ? maskPan(values.pan) : null,
    address: values.address.trim(),
    city: values.city.trim(),
    state: values.state,
    pincode: values.pincode.trim(),
    applicant: {
      name: values.applicantName.trim(),
      relationship: values.relationship,
      maskedPhone: maskPhone(values.applicantPhone),
      email: values.applicantEmail.trim(),
    },
    registeredOn: today,
    updatedOn: today,
  };

  store.addPerson(person);

  // The four case documents are created once here; claims added later refer to them.
  REGISTRATION_DOCUMENTS.forEach((def) => {
    const file = files[def.key];
    store.addDocument({
      id: `${id}-${def.key}`,
      caseId: id,
      name: def.name,
      category: 'CASE',
      status: file ? 'Uploaded' : 'Required',
      relatedAssetType: null,
      relatedAssetId: null,
      relatedClaimId: null,
      fileName: file?.fileName ?? null,
      fileSize: file?.size ?? null,
      uploadedDate: file ? today : null,
      lastUpdated: file ? today : null,
    });
  });

  recordEvent(id, {
    activity: { kind: 'progress', title: `Case ${person.caseRef} was registered.` },
    notification: {
      category: 'SYSTEM',
      priority: 'SUCCESS',
      title: 'Case registered',
      description: `Case ${person.caseRef} for ${person.name} was registered.`,
      relatedLabel: `${person.name} · ${person.caseRef}`,
      href: `/deceased/${id}`,
    },
  });
  REGISTRATION_DOCUMENTS.filter((def) => files[def.key]).forEach((def) => {
    recordEvent(id, { activity: { kind: 'upload', title: `${def.name} was uploaded.` } });
  });

  return respond({ person, documents: caseDocumentViews(id) }, WRITE_DELAY_MS);
}

/* Documents — the central document store -------------------------------- */

/** Names of the documents that exist once per case and are shared by its claims. */
const CASE_DOCUMENT_NAMES = REGISTRATION_DOCUMENTS.map((def) => def.name);

/** The claims that need a document: its own claim, or every claim sharing a case document. */
function claimsUsingDocument(doc) {
  if (doc.relatedClaimId) return [store.getClaim(doc.relatedClaimId)].filter(Boolean);
  return store.getClaims(doc.caseId).filter((c) => c.documentIds.includes(doc.id));
}

/**
 * A document as pages see it: the stored record plus the claims / assets it
 * relates to. `updatedOn` mirrors `lastUpdated` for the document tables built
 * across the app.
 */
function documentView(doc) {
  return {
    ...doc,
    updatedOn: doc.lastUpdated,
    shared: doc.category === 'CASE',
    relatedClaims: claimsUsingDocument(doc).map((claim) => {
      const asset = assetForClaim(claim);
      const isBank = claim.assetType === 'BANK';
      return {
        id: claim.id,
        claimReference: claim.claimReference,
        assetType: claim.assetType,
        institutionName: claim.institutionName,
        assetReference: claim.assetReference,
        assetLabel: `${claim.institutionName} ${asset ? (isBank ? asset.accountType : asset.policyType) : ''}`.trim(),
        assetHref: asset ? `${isBank ? '/bank-accounts' : '/insurance'}/${asset.id}` : null,
      };
    }),
  };
}

const caseDocumentViews = (caseId) =>
  store
    .getDocuments(caseId)
    .filter((d) => d.category === 'CASE')
    .map(documentView);

/** The documents a claim requires, resolved from the central store. */
const claimDocuments = (claim) =>
  claim.documentIds
    .map((id) => store.getDocument(id))
    .filter(Boolean)
    .map((doc) => ({ ...doc, updatedOn: doc.lastUpdated, shared: doc.category === 'CASE' }));

/**
 * Keeps every claim that needs `doc` in step after the document changes:
 *  - the first upload moves "Asset Identified" on to the documents stage;
 *  - before submission the asset reads "Documents Required" until the claim's
 *    last document arrives, then "Documents Collected".
 * A shared case document can therefore advance several claims at once.
 */
function syncClaimsForDocument(doc, today) {
  claimsUsingDocument(doc).forEach(({ id }) => {
    const claim = store.updateClaim(id, (c) => {
      c.lastUpdated = today;
      if (c.currentStage === 'IDENTIFIED') c.currentStage = 'DOCUMENTS';
    });
    const complete = !claimDocuments(claim).some(isOutstanding);
    updateAssetForClaim(claim, (asset) => {
      asset.lastUpdated = today;
      if (isPreSubmission(claim)) {
        asset.assetStatus = complete ? 'Documents Collected' : 'Documents Required';
      } else if (complete && asset.assetStatus === 'Documents Required') {
        asset.assetStatus = 'Documents Collected';
      }
    });
    if (complete && isPreSubmission(claim)) {
      recordEvent(claim.caseId, {
        notification: {
          category: 'CLAIMS',
          priority: 'INFO',
          title: 'Claim ready to submit',
          description: `All required documents for the ${claim.institutionName} claim are collected.`,
          relatedLabel: `${claim.institutionName} · ${claim.claimReference}`,
          href: `/claims/${claim.id}`,
        },
      });
    }
  });
}

/**
 * The one place a (simulated) upload is recorded, whichever page it came from.
 * Only the file's name and size are kept.
 */
function recordDocumentUpload(documentId, file) {
  if (!store.getDocument(documentId)) return null;
  const today = todayIso();
  const doc = store.updateDocument(documentId, (d) => {
    d.status = 'Uploaded';
    d.fileName = file.fileName;
    d.fileSize = file.size ?? null;
    d.uploadedDate = today;
    d.lastUpdated = today;
  });
  // A "document required" notice is settled once the document arrives.
  store.removeNotifications((n) => n.requiredDocumentId === documentId);
  recordEvent(doc.caseId, {
    activity: { kind: 'upload', title: `${doc.name} was uploaded.` },
    notification: {
      category: 'DOCUMENTS',
      priority: 'SUCCESS',
      title: 'Document uploaded',
      description: `${doc.name} has been uploaded successfully.`,
      relatedLabel: documentView(doc).relatedClaims.length === 1 && !doc.shared
        ? documentView(doc).relatedClaims[0].assetLabel
        : doc.category === 'CASE'
          ? 'Case document'
          : null,
      href: `/documents/${doc.id}`,
    },
  });
  syncClaimsForDocument(doc, today);
  if (doc.category === 'CASE') store.updatePerson(doc.caseId, { updatedOn: today });
  return doc;
}

/** Future: GET /api/cases/:caseId/documents — every document in the case. */
export function getDocuments(caseId) {
  return respond(store.getDocuments(caseId).map(documentView));
}

/** Future: GET /api/cases/:caseId/documents?category=CASE */
export function getCaseDocuments(caseId) {
  return respond(caseDocumentViews(caseId));
}

/** Future: GET /api/documents/:id */
export function getDocumentById(id) {
  const doc = store.getDocument(id);
  if (!doc) return fail('Document not found.', 'NOT_FOUND');
  return respond(documentView(doc));
}

/**
 * Future: PUT /api/documents/:id/file (multipart)
 * Simulated: nothing is sent anywhere; only the file name and size are recorded.
 */
export function uploadDocument(documentId, file) {
  const doc = recordDocumentUpload(documentId, file);
  if (!doc) return fail('Document not found.', 'NOT_FOUND');
  return respond(documentView(doc), WRITE_DELAY_MS);
}

/**
 * Future: POST /api/documents/:id/verify
 *
 * DEMONSTRATION ONLY: marks an uploaded document as verified inside
 * LegacyTrack. No external verification service is involved.
 */
export function verifyDocument(documentId) {
  const existing = store.getDocument(documentId);
  if (!existing) return fail('Document not found.', 'NOT_FOUND');
  if (existing.status !== 'Uploaded') {
    return fail('Only an uploaded document can be marked as verified.', 'NOT_READY');
  }
  const today = todayIso();
  const doc = store.updateDocument(documentId, (d) => {
    d.status = 'Verified';
    d.lastUpdated = today;
  });
  recordEvent(doc.caseId, {
    activity: { kind: 'verified', title: `${doc.name} was marked as verified (demo).` },
    notification: {
      category: 'DOCUMENTS',
      priority: 'SUCCESS',
      title: 'Document marked as verified',
      description: `${doc.name} was marked as verified in LegacyTrack. No external verification took place.`,
      href: `/documents/${doc.id}`,
    },
  });
  return respond(documentView(doc), WRITE_DELAY_MS);
}

/** Case documents from the Deceased Person page: same upload, case-shaped reply. */
export function uploadCaseDocument(caseId, documentId, file) {
  const existing = store.getDocument(documentId);
  if (!existing || existing.caseId !== caseId) return fail('Document not found.', 'NOT_FOUND');
  recordDocumentUpload(documentId, file);
  return respond(
    { person: store.getPerson(caseId), documents: caseDocumentViews(caseId) },
    WRITE_DELAY_MS,
  );
}

/* Claims — the central claim state ---------------------------------------- */

const later = (a, b) => (a > b ? a : b);

function assetForClaim(claim) {
  return claim.assetType === 'BANK'
    ? store.getBankAccount(claim.assetId)
    : store.getInsurancePolicy(claim.assetId);
}

function updateAssetForClaim(claim, mutate) {
  return claim.assetType === 'BANK'
    ? store.updateBankAccount(claim.assetId, mutate)
    : store.updateInsurancePolicy(claim.assetId, mutate);
}

/** A claim plus the few asset fields the Claims pages display. */
function claimView(claim) {
  const asset = assetForClaim(claim);
  const isBank = claim.assetType === 'BANK';
  return {
    ...claim,
    documents: claimDocuments(claim),
    asset: asset && {
      id: asset.id,
      product: isBank ? asset.accountType : asset.policyType,
      maskedNumber: isBank ? asset.maskedAccountNumber : asset.maskedPolicyNumber,
      assetStatus: asset.assetStatus,
      identifiedDate: asset.identifiedDate,
      href: `${isBank ? '/bank-accounts' : '/insurance'}/${asset.id}`,
    },
  };
}

/**
 * Creates the claim for a newly added asset. Case-level documents are not
 * copied: the claim simply refers to the case's existing record, so anything
 * already uploaded for the case counts straight away. Claim-specific documents
 * (claim form, policy document) are created as Required.
 */
function createClaim({ caseId, assetType, assetId, institutionName, assetReference, claimAmount, documentNames }) {
  const today = todayIso();
  const prefix = assetType === 'BANK' ? 'BNK' : 'INS';
  const sequence = store.getAllClaims().filter((c) => c.assetType === assetType).length + 1;
  const id = `CLM-${prefix}-${String(sequence).padStart(4, '0')}`;

  const documentIds = documentNames.map((name) => {
    if (CASE_DOCUMENT_NAMES.includes(name)) {
      const shared = store.getDocuments(caseId).find((d) => d.category === 'CASE' && d.name === name);
      if (shared) return shared.id;
    }
    const isCaseLevel = CASE_DOCUMENT_NAMES.includes(name);
    const document = {
      id: `${isCaseLevel ? caseId : id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      caseId,
      name,
      category: isCaseLevel ? 'CASE' : assetType === 'BANK' ? 'BANK_CLAIM' : 'INSURANCE_CLAIM',
      status: 'Required',
      relatedAssetType: isCaseLevel ? null : assetType,
      relatedAssetId: isCaseLevel ? null : assetId,
      relatedClaimId: isCaseLevel ? null : id,
      fileName: null,
      fileSize: null,
      uploadedDate: null,
      lastUpdated: null,
    };
    store.addDocument(document);
    return document.id;
  });

  const claim = {
    id,
    caseId,
    assetType,
    assetId,
    institutionName,
    assetReference,
    claimReference: id,
    claimAmount,
    claimStatus: 'Pending',
    currentStage: 'IDENTIFIED',
    createdDate: today,
    submittedDate: null,
    settledDate: null,
    lastUpdated: today,
    documentIds,
  };
  store.addClaim(claim);
  return claim;
}

/** Uploads a document on behalf of a claim; false if the claim does not need it. */
function uploadForClaim(claimId, documentId, file) {
  const claim = store.getClaim(claimId);
  if (!claim || !claim.documentIds.includes(documentId)) return false;
  return Boolean(recordDocumentUpload(documentId, file));
}

/** Future: GET /api/cases/:caseId/claims */
export function getClaims(caseId) {
  return respond(store.getClaims(caseId).map(claimView));
}

/** Future: GET /api/claims/:id */
export function getClaim(id) {
  const claim = store.getClaim(id);
  if (!claim) return fail('Claim not found.', 'NOT_FOUND');
  return respond(claimView(claim));
}

/** Future: PUT /api/documents/:id/file — the same central upload, replying with the claim. */
export function uploadClaimDocument(claimId, documentId, file) {
  if (!uploadForClaim(claimId, documentId, file)) return fail('Claim document not found.', 'NOT_FOUND');
  return respond(claimView(store.getClaim(claimId)), WRITE_DELAY_MS);
}

/**
 * Future: POST /api/claims/:id/submit
 *
 * DEMONSTRATION ONLY: marks the claim as submitted inside LegacyTrack. Nothing
 * is sent to any bank, insurer or other organisation.
 */
export function submitClaim(claimId) {
  const existing = store.getClaim(claimId);
  if (!existing) return fail('Claim not found.', 'NOT_FOUND');
  if (!canSubmit({ ...existing, documents: claimDocuments(existing) })) {
    return fail('This claim is not ready to submit. Upload the required documents first.', 'NOT_READY');
  }

  const today = todayIso();
  const claim = store.updateClaim(claimId, (c) => {
    c.currentStage = 'SUBMITTED';
    c.claimStatus = submittedStatusFor(c.assetType);
    c.submittedDate = today;
    c.lastUpdated = today;
  });
  updateAssetForClaim(claim, (asset) => {
    asset.lastUpdated = today;
  });
  recordEvent(claim.caseId, {
    activity: { kind: 'progress', title: `Claim ${claim.claimReference} was marked as submitted (demo).` },
    notification: {
      category: 'CLAIMS',
      priority: 'INFO',
      title: 'Claim marked as submitted',
      description: `The ${claim.institutionName} claim was marked as ${claim.claimStatus} in LegacyTrack. No real claim was sent.`,
      relatedLabel: `${claim.institutionName} · ${claim.claimReference}`,
      href: `/claims/${claim.id}`,
    },
  });
  return respond(claimView(claim), WRITE_DELAY_MS);
}

/**
 * An asset joined with its claim. Bank and insurance pages read claim fields
 * (status, stage, reference, documents) from here, so claim state has one home.
 */
function withClaim(asset) {
  const claim = store.getClaim(asset.claimId);
  if (!claim) return { ...asset, documents: [] };
  return {
    ...asset,
    claimStatus: claim.claimStatus,
    claimStage: claim.currentStage,
    claimReference: claim.claimReference,
    submittedDate: claim.submittedDate,
    documents: claimDocuments(claim),
    lastUpdated: later(asset.lastUpdated, claim.lastUpdated),
  };
}

/* Bank accounts ---------------------------------------------------------- */

/** Future: GET /api/cases/:caseId/bank-accounts */
export function getBankAccounts(caseId) {
  return respond(store.getBankAccounts(caseId).map(withClaim));
}

/** Future: GET /api/bank-accounts/:id */
export function getBankAccount(id) {
  const account = store.getBankAccount(id);
  if (!account) return fail('Bank account not found.', 'NOT_FOUND');
  return respond(withClaim(account));
}

/**
 * Future: POST /api/cases/:caseId/bank-accounts
 *
 * `values` are the validated Add Bank Account form values. Only the last four
 * digits of the account number are ever collected. A claim is opened for the
 * account at the same time.
 */
export function addBankAccount(caseId, values) {
  if (!store.getPerson(caseId)) return fail('Deceased person record not found.', 'NOT_FOUND');

  const today = todayIso();
  const sequence = store.getAllBankAccounts().length + 1;
  const id = `bank-${String(sequence).padStart(3, '0')}`;
  const bankName = values.bankName.trim();
  const estimatedAmount = Number(String(values.estimatedAmount).replace(/,/g, ''));
  const assetReference =
    values.assetReference.trim().toUpperCase() || `AST-BNK-${String(sequence).padStart(4, '0')}`;

  const claim = createClaim({
    caseId,
    assetType: 'BANK',
    assetId: id,
    institutionName: bankName,
    assetReference,
    claimAmount: estimatedAmount,
    documentNames: BANK_CLAIM_DOCUMENTS,
  });

  const account = {
    id,
    caseId,
    claimId: claim.id,
    bankName,
    accountType: values.accountType,
    maskedAccountNumber: `${ACCOUNT_MASK_PREFIX} ${values.lastFourDigits}`,
    estimatedAmount,
    assetReference,
    assetStatus: 'Asset Identified',
    identifiedDate: values.identifiedDate,
    lastUpdated: today,
    notes: values.notes.trim(),
  };

  store.addBankAccount(account);
  recordEvent(caseId, {
    activity: { kind: 'progress', title: `${bankName} ${values.accountType} was added to the asset register.` },
    notification: {
      category: 'CLAIMS',
      priority: 'INFO',
      title: 'Claim opened',
      description: `Claim ${claim.id} was opened for ${bankName} ${values.accountType}.`,
      relatedLabel: `${bankName} ${values.accountType} · ${claim.id}`,
      href: `/claims/${claim.id}`,
    },
  });
  store.updatePerson(caseId, { updatedOn: today });
  return respond(withClaim(account), WRITE_DELAY_MS);
}

/** Future: PUT /api/documents/:id/file — the same central upload the Documents page uses. */
export function uploadBankDocument(accountId, documentId, file) {
  const account = store.getBankAccount(accountId);
  if (!account || !uploadForClaim(account.claimId, documentId, file)) {
    return fail('Bank account not found.', 'NOT_FOUND');
  }
  return respond(withClaim(store.getBankAccount(accountId)), WRITE_DELAY_MS);
}

/* Insurance policies ----------------------------------------------------- */

/** Future: GET /api/cases/:caseId/insurance-policies */
export function getInsurancePolicies(caseId) {
  return respond(store.getInsurancePolicies(caseId).map(withClaim));
}

/** Future: GET /api/insurance-policies/:id */
export function getInsurancePolicy(id) {
  const policy = store.getInsurancePolicy(id);
  if (!policy) return fail('Insurance policy not found.', 'NOT_FOUND');
  return respond(withClaim(policy));
}

/**
 * Future: POST /api/cases/:caseId/insurance-policies
 *
 * `values` are the validated Add Insurance Policy form values. Only the last
 * four digits of the policy number are ever collected. A claim is opened for
 * the policy at the same time.
 */
export function addInsurancePolicy(caseId, values) {
  if (!store.getPerson(caseId)) return fail('Deceased person record not found.', 'NOT_FOUND');

  const today = todayIso();
  const sequence = store.getAllInsurancePolicies().length + 1;
  const id = `ins-${String(sequence).padStart(3, '0')}`;
  const insuranceCompany = values.insuranceCompany.trim();
  const claimAmount = Number(String(values.claimAmount).replace(/,/g, ''));
  const assetReference =
    values.assetReference.trim().toUpperCase() || `AST-INS-${String(sequence).padStart(4, '0')}`;

  const claim = createClaim({
    caseId,
    assetType: 'INSURANCE',
    assetId: id,
    institutionName: insuranceCompany,
    assetReference,
    claimAmount,
    documentNames: INSURANCE_CLAIM_DOCUMENTS,
  });

  const policy = {
    id,
    caseId,
    claimId: claim.id,
    insuranceCompany,
    policyType: values.policyType,
    maskedPolicyNumber: `${POLICY_MASK_PREFIX}${values.lastFourDigits}`,
    claimAmount,
    assetReference,
    assetStatus: 'Asset Identified',
    identifiedDate: values.identifiedDate,
    lastUpdated: today,
    notes: values.notes.trim(),
  };

  store.addInsurancePolicy(policy);
  recordEvent(caseId, {
    activity: { kind: 'progress', title: `${insuranceCompany} ${values.policyType} was added to the asset register.` },
    notification: {
      category: 'CLAIMS',
      priority: 'INFO',
      title: 'Claim opened',
      description: `Claim ${claim.id} was opened for ${insuranceCompany} ${values.policyType}.`,
      relatedLabel: `${insuranceCompany} ${values.policyType} · ${claim.id}`,
      href: `/claims/${claim.id}`,
    },
  });
  store.updatePerson(caseId, { updatedOn: today });
  return respond(withClaim(policy), WRITE_DELAY_MS);
}

/** Future: PUT /api/documents/:id/file — the same central upload the Documents page uses. */
export function uploadInsuranceDocument(policyId, documentId, file) {
  const policy = store.getInsurancePolicy(policyId);
  if (!policy || !uploadForClaim(policy.claimId, documentId, file)) {
    return fail('Insurance policy not found.', 'NOT_FOUND');
  }
  return respond(withClaim(store.getInsurancePolicy(policyId)), WRITE_DELAY_MS);
}

/* Assets, activity, notifications --------------------------------------- */

const EARLY_STAGES = ['IDENTIFIED', 'DOCUMENTS'];

/** Bank account -> the generic asset row the Dashboard renders. */
function bankAccountToAsset(account) {
  return {
    id: account.id,
    deceasedId: account.caseId,
    type: 'BANK',
    institution: account.bankName,
    product: account.accountType,
    maskedNumber: account.maskedAccountNumber,
    amount: account.estimatedAmount,
    // Before a claim is filed the asset status is the useful one; after, the claim status.
    status: EARLY_STAGES.includes(account.claimStage) ? account.assetStatus : account.claimStatus,
    stage: account.claimStage,
    lastUpdated: account.lastUpdated,
    href: `/bank-accounts/${account.id}`,
  };
}

/** Insurance policy -> the generic asset row the Dashboard renders. */
function insurancePolicyToAsset(policy) {
  return {
    id: policy.id,
    deceasedId: policy.caseId,
    type: 'INSURANCE',
    institution: policy.insuranceCompany,
    product: policy.policyType,
    maskedNumber: policy.maskedPolicyNumber,
    amount: policy.claimAmount,
    status: EARLY_STAGES.includes(policy.claimStage) ? policy.assetStatus : policy.claimStatus,
    stage: policy.claimStage,
    lastUpdated: policy.lastUpdated,
    href: `/insurance/${policy.id}`,
  };
}

/** Future: GET /api/deceased-persons/:id/activity — newest first. */
export function getRecentActivity(deceasedId) {
  const entries = store
    .getActivity(deceasedId)
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => (a.date === b.date ? b.index - a.index : a.date < b.date ? 1 : -1))
    .slice(0, 6)
    .map(({ index, caseId, ...entry }) => entry);
  return respond(entries);
}

/* Notifications ---------------------------------------------------------- */

const newestFirst = (a, b) =>
  a.timestamp === b.timestamp ? (a.id < b.id ? 1 : -1) : a.timestamp < b.timestamp ? 1 : -1;

/** Future: GET /api/cases/:caseId/notifications — newest first. */
export function getNotifications(caseId) {
  return respond([...store.getNotifications(caseId)].sort(newestFirst));
}

/** Future: PATCH /api/notifications/:id { read } */
export function setNotificationRead(id, read) {
  if (!store.getNotification(id)) return fail('Notification not found.', 'NOT_FOUND');
  store.updateNotifications((n) => n.id === id, { read });
  return respond(store.getNotification(id), 150);
}

/** Future: POST /api/cases/:caseId/notifications/mark-all-read */
export function markAllNotificationsRead(caseId) {
  store.updateNotifications((n) => n.caseId === caseId, { read: true });
  return respond([...store.getNotifications(caseId)].sort(newestFirst), 150);
}

/** Future: DELETE /api/notifications/:id. Demo only: removes it from this session. */
export function deleteNotification(id) {
  if (!store.getNotification(id)) return fail('Notification not found.', 'NOT_FOUND');
  store.removeNotifications((n) => n.id === id);
  return respond({ id }, 150);
}

/* Global search ---------------------------------------------------------- */

const SEARCH_LIMIT = 5;
const fold = (text) => String(text ?? '').toLowerCase().replace(/\s+/g, '');

/**
 * Future: GET /api/cases/:caseId/search?q=
 *
 * Searches one case only: the deceased person, bank accounts, insurance
 * policies, claims and documents. Returns groups in a fixed order, each with
 * `{ id, title, subtitle, href }` items; groups with no match are left out.
 */
export function searchCase(caseId, query) {
  const needle = fold(query);
  const person = store.getPerson(caseId);
  if (!needle || !person) return respond([], 120);
  const matches = (...fields) => fields.some((field) => fold(field).includes(needle));

  const groups = [
    {
      id: 'person',
      label: 'Person',
      icon: 'user',
      items: matches(person.name, person.caseRef, person.city)
        ? [
            {
              id: person.id,
              title: person.name,
              subtitle: `Deceased person · ${person.caseRef}`,
              href: `/deceased/${person.id}`,
            },
          ]
        : [],
    },
    {
      id: 'bank',
      label: 'Bank',
      icon: 'bank',
      items: store
        .getBankAccounts(caseId)
        .filter((a) => matches(a.bankName, a.accountType, `${a.bankName} ${a.accountType}`, a.maskedAccountNumber, a.assetReference))
        .map((a) => ({
          id: a.id,
          title: `${a.bankName} ${a.accountType}`,
          subtitle: `${a.maskedAccountNumber} · ${a.assetReference}`,
          href: `/bank-accounts/${a.id}`,
        })),
    },
    {
      id: 'insurance',
      label: 'Insurance',
      icon: 'shield',
      items: store
        .getInsurancePolicies(caseId)
        .filter((p) => matches(p.insuranceCompany, p.policyType, `${p.insuranceCompany} ${p.policyType}`, p.maskedPolicyNumber, p.assetReference))
        .map((p) => ({
          id: p.id,
          title: `${p.insuranceCompany} ${p.policyType}`,
          subtitle: `${p.maskedPolicyNumber} · ${p.assetReference}`,
          href: `/insurance/${p.id}`,
        })),
    },
    {
      id: 'claim',
      label: 'Claim',
      icon: 'claims',
      items: store
        .getClaims(caseId)
        .filter((c) => matches(c.claimReference, c.institutionName, c.assetReference, c.claimStatus))
        .map((c) => ({
          id: c.id,
          title: c.claimReference,
          subtitle: `${c.institutionName} · ${c.claimStatus}`,
          href: `/claims/${c.id}`,
        })),
    },
    {
      id: 'document',
      label: 'Document',
      icon: 'file',
      items: store
        .getDocuments(caseId)
        .map(documentView)
        .filter((d) => matches(d.name, d.fileName, ...d.relatedClaims.map((c) => (d.shared ? '' : c.assetLabel))))
        .map((d) => ({
          id: d.id,
          title: d.name,
          subtitle: d.shared
            ? `Case document · ${d.status}`
            : `${d.relatedClaims[0]?.assetLabel ?? 'Claim document'} · ${d.status}`,
          href: `/documents/${d.id}`,
        })),
    },
  ];

  return respond(
    groups
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        ...group,
        total: group.items.length,
        items: group.items.slice(0, SEARCH_LIMIT),
      })),
    120,
  );
}

/* Legal heir KYC (demo) -------------------------------------------------- */

const KYC_DELAY_MS = 1600;

/**
 * Future: POST /api/kyc/verify
 *
 * DEMONSTRATION ONLY: waits briefly and reports success. Nothing is sent to
 * UIDAI, the Income Tax Department, a bank or any KYC provider, and nothing is
 * checked against real records. The reply holds masked values only, so the
 * full PAN, Aadhaar and mobile numbers are never kept.
 */
export function verifyKyc(values) {
  return respond(
    {
      fullName: values.fullName.trim(),
      maskedMobile: maskPhone(values.mobile),
      maskedPan: maskPan(values.pan),
      maskedAadhaar: maskAadhaar(values.aadhaar),
      verifiedOn: todayIso(),
    },
    KYC_DELAY_MS,
  );
}

/* Preferences and demo reset --------------------------------------------- */

/** Future: GET /api/me/preferences. Demo only: nothing is sent anywhere. */
export function getPreferences() {
  return respond(store.getPreferences(), 150);
}

/** Future: PATCH /api/me/preferences */
export function setPreference(key, value) {
  store.setPreference(key, value);
  return respond(store.getPreferences(), 150);
}

/** Demo helper: puts every record back to the original sample data. */
export function resetDemoData() {
  store.reset();
  return respond({ ok: true }, WRITE_DELAY_MS);
}

/* Dashboard -------------------------------------------------------------- */

/** Future: GET /api/deceased-persons/:id/dashboard (single aggregated call) */
export async function getDashboard(deceasedId) {
  const [person, accounts, policies, docs, activity] = await Promise.all([
    getDeceasedPerson(deceasedId),
    getBankAccounts(deceasedId),
    getInsurancePolicies(deceasedId),
    getDocuments(deceasedId),
    getRecentActivity(deceasedId),
  ]);

  const bank = accounts.map(bankAccountToAsset);
  const insurance = policies.map(insurancePolicyToAsset);
  const personAssets = [...bank, ...insurance];
  const isSettled = (a) => a.stage === 'SETTLED';
  const completed = personAssets.filter(isSettled);

  // Each outstanding document is counted once, even when several claims need it.
  const outstandingDocuments = docs.filter(isOutstanding).map((doc) => ({
    ...doc,
    neededFor:
      doc.relatedClaims.length > 2
        ? `${doc.relatedClaims.length} claims`
        : doc.relatedClaims.map((c) => c.assetLabel).join(', ') || null,
  }));
  const outstandingIn = (category) => outstandingDocuments.filter((d) => d.category === category).length;

  const caseClaims = store.getClaims(deceasedId).map(claimView);
  const recentClaims = [...caseClaims]
    .sort((a, b) => (a.lastUpdated < b.lastUpdated ? 1 : a.lastUpdated > b.lastUpdated ? -1 : 0))
    .slice(0, 5);

  const claimSummary = summariseClaims(caseClaims);

  return {
    person,
    claims: { summary: claimSummary, recent: structuredClone(recentClaims) },
    assets: personAssets,
    documents: docs,
    documentSummary: summariseDocuments(docs),
    outstandingDocuments,
    activity,
    summary: {
      totalValue: personAssets.reduce((sum, a) => sum + a.amount, 0),
      bankCount: bank.length,
      bankValue: bank.reduce((sum, a) => sum + a.amount, 0),
      insuranceCount: insurance.length,
      insuranceValue: insurance.reduce((sum, a) => sum + a.amount, 0),
      pendingClaims: personAssets.length - completed.length,
      pendingBankClaims: bank.filter((a) => !isSettled(a)).length,
      pendingInsuranceClaims: insurance.filter((a) => !isSettled(a)).length,
      completedClaims: completed.length,
      documentsRequired: outstandingDocuments.length,
      caseDocumentsRequired: outstandingIn('CASE'),
      bankDocumentsRequired: outstandingIn('BANK_CLAIM'),
      insuranceDocumentsRequired: outstandingIn('INSURANCE_CLAIM'),
      documentsTotal: docs.length,
      totalClaimValue: claimSummary.totalAmount,
    },
  };
}
