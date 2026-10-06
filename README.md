# LegacyTrack — Financial Asset & Claim Management Platform

**Simplifying Financial Legacy Management.**

A client-demo MVP for organizing and tracking deceased-person financial assets, claims and
documents. A family member or legal heir registers the deceased person, records the bank
accounts and insurance policies they have identified, gathers the documents each claim
needs, and follows every claim through to settlement.

## Important

The application currently uses **fictional mock data**.

**No government, bank or insurance API integrations are implemented.** LegacyTrack makes no
network calls, does not connect to any bank, insurer, regulator or government system, and
does not send emails or alerts. Actions such as *Submit Claim*, *Upload Document* and
*Mark as Verified* only change the demo's own records and say so in the interface.

## Tech Stack

- React 18
- Vite 5
- JavaScript (no TypeScript)
- React Router 6
- Plain CSS with design tokens (`src/styles/tokens.css`)

## Current Scope

- **Legal Heir KYC (demo)** — a simulated identity step between sign-in and the
  application; format validation only, masked values, no external KYC service
- **Deceased Person Management** — registration with validation, case details, case list
  and switching between cases
- **Bank Accounts** — list, search and filters, details, add account
- **Insurance Policies** — list, search and filters, details, add policy
- **Claims** — one claim per asset, unified list, details, six-stage timeline, demo
  *Submit Claim*
- **Documents** — one central store; case documents are shared by the claims that need
  them; simulated upload and demo verification
- **Notifications** — read/unread, filters, mark all read, delete, links to the related
  record, unread count in the header
- **Global Search** — across the active case: person, bank accounts, insurance policies,
  claims and documents
- **Dashboard** — financial summary, claims overview, documents overview, recent activity,
  quick actions
- **Profile & Settings** — demo account details, demo preference toggles, reset demo data

Every page is scoped to the **active case**; nothing from one case appears in another.

## Run

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and choose **Continue with demo account** (or sign in with any
valid email and a password of 6 or more characters).

## Build

```bash
npm run build
```

The production build is written to `dist/`. `npm run preview` serves it locally.

## Demo data

- The sample case is **Rajesh Kumar** (case `LT-2026-00148`) with 4 bank accounts,
  4 insurance policies, 8 claims and 14 documents.
- Changes made during a demo are kept in the browser tab (`sessionStorage`). Closing the
  tab, or **Profile & Settings → Reset demo data**, restores the original sample data.
- Account and policy numbers are stored masked (last four digits only). Uploads record the
  file name and size only; file contents are never read or stored.

## Project structure

```
src/
  main.jsx               App entry: router, providers, styles
  App.jsx                Route table
  routes/
    navigation.js        Sidebar items and page titles
    ProtectedRoute.jsx   Redirects signed-out users to /login
    KycRoute.jsx         Redirects to /kyc until the demo KYC is completed
  context/
    AuthContext.jsx      Demo sign-in
    KycContext.jsx       Demo legal heir KYC state for the session
    CaseContext.jsx      The active case
    NotificationsContext.jsx  Unread count for the header
  services/
    api.js               The only place the UI reads or writes data
    claimRules.js        Claim rules shared by bank and insurance claims
    documentRules.js     Document categories, statuses and summaries
  data/
    mockData.js          Claim stages, demo user, sample person, sample activity
    bankAccounts.js      Sample bank accounts
    insurancePolicies.js Sample insurance policies
    claims.js            Sample claims (the source of truth for claim state)
    documents.js         Sample documents (the source of truth for document state)
    notifications.js     Sample notifications
    constants.js         Option lists used by forms
    store.js             In-browser demo store (removed once a backend exists)
  utils/                 format, mask, validation
  components/
    layout/              AppLayout, Sidebar, Header, GlobalSearch
    dashboard/           ClaimsOverview, DocumentsOverview
    ui/                  Shared building blocks (badges, cards, timeline, upload, dialog…)
  pages/                 One file per page
  styles/                tokens (brand), global, layout, components, and one file per area
```

## Connecting a backend later

Pages never touch the mock data directly; they call functions in `src/services/api.js`.
Each function notes the REST endpoint it stands in for (for example
`GET /api/cases/:caseId/claims`). Replacing those function bodies with `fetch` calls to a
Spring Boot API — and `login` in `AuthContext.jsx` with real authentication — leaves the
pages unchanged. `src/data/store.js` and the sample data files can then be removed.
