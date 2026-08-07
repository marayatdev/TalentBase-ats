# TalentBase HR — Applicant Tracking System (Frontend)

A React + TypeScript + Tailwind CSS + shadcn/ui frontend for an internal HR
applicant tracking platform: jobs, candidates, resumes, applications,
recruitment pipelines, AI resume parsing, AI job matching, and candidate
imports from Facebook/LinkedIn via a browser extension.

## Getting started

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm run build     # type-check and produce a production build in dist/
```

The app expects a backend at `http://localhost:3000/api` (see
`src/api/axios.ts`). **You don't need the backend running to explore the UI.**
In development, any GET request that fails because the backend is
unreachable automatically falls back to realistic seed data from
`src/mocks/` (jobs, candidates, applications, resumes, AI analysis, etc. for
Backend Developer, DevOps Engineer, HR Officer, Accountant, and Sales
Executive). Login/registration also accept any credentials in dev mode when
no backend is present. This fallback never runs in production builds, and
all mutations (create/update/delete) still call the real API.

## Project structure

```
src/
  api/            axios instance + one file per resource (jobs, candidates, …)
  components/
    layout/       Sidebar, Header, Breadcrumbs, AppLayout, ProtectedRoute
    shared/       Reusable app components (PageHeader, EmptyState, Pagination,
                   ConfirmDialog, StatusBadges, ResumeUpload, AIJobMatchPanel, …)
    ui/           shadcn/ui-style primitives (button, card, dialog, table, …)
  hooks/          React Query hooks (useJobs, useCandidates, useApplications, …)
  mocks/          Dev-only seed data and mock service — isolated from components
  pages/          One folder per route group (auth, dashboard, jobs, candidates,
                   applications, pipeline, imports, ai-analysis, settings)
  store/          Zustand stores (auth session, layout UI state)
  types/          Shared TypeScript types matching the API contract
```

## Notable implementation details

- **IDs and decimals**: all BIGINT ids are typed as `string` end-to-end and
  never coerced to `number`; the same applies to decimal fields like salary.
- **Pipeline stage reordering** and the **Kanban recruitment board** both use
  `@dnd-kit` for drag-and-drop, with optimistic UI + rollback on failure for
  stage moves, and a confirmation dialog before moving a card into a
  "Hired" or "Rejected" stage.
- **Resume upload** validates file type (PDF/DOCX) and size (10 MB) client-side
  and reports upload progress via axios `onUploadProgress`.
- **AI resume parsing** polls for results while status is `processing`, hides
  raw extracted text behind a collapsible section, and always shows the
  required HR-review disclaimer.
- **AI job matching** shows score breakdowns, matched/missing/extra skills,
  strengths/concerns, a skill detail table, suggested interview questions,
  and the required advisory disclaimer.
- **Filters are preserved in the URL** (`useSearchParams`) for jobs,
  candidates, and applications lists, so links are shareable and back/forward
  navigation works as expected.
- **Accessibility & responsiveness**: forms use labelled inputs, dialogs trap
  focus via Radix primitives, tables collapse into cards on mobile, and the
  sidebar becomes a drawer on small screens.
- No hiring or filtering decisions are automated anywhere in the UI, and
  candidate filtering by protected attributes (age, gender, religion,
  ethnicity, marital status, photo) is intentionally not implemented.

## Environment

- The API base URL is set in `src/api/axios.ts`
  (`http://localhost:3000/api`, `withCredentials: true`). Update it there if
  your backend runs elsewhere.
