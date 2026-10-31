# Billora frontend — Phase 1

Run from `frontend/` with Node 22.12+ (or Node 24) and npm:

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

On Windows PowerShell with script execution restricted, use `npm.cmd` instead of `npm`.
Vite requires port **5173** and proxies `/api` to `http://localhost:8000` without changing the browser origin. No environment secrets are required. Inter is bundled locally.

## Scope and integration

Phase 1 includes the scaffold, tokens, shared UI, cookie/CSRF API client, authentication provider, protected staff/admin and customer shells, and a read-only session account screen. Operational modules are visibly unavailable. Overview cards show `—` until reporting is integrated; this does not mean zero revenue or an empty dataset. No P1/P2 features are implemented.

Only `src/app/router.tsx` integrates routes. Abiya can export named screens from her feature folders for the integration owner to wire in. Shared components are exported from `src/components/ui` and `src/components/data`. Use the client exported from `src/lib/api`, and format server minor units with `Money` / `formatMoney`.

## Backend handoff — unresolved contracts

At Phase 1 implementation, the repository contained only `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN.md`, with no backend or shared TypeScript contracts. Initial backend auth source has since been added and inspected; see the authentication checkpoint below. No shared contracts were created or edited. `src/features/auth/contract.ts` remains a feature-local adapter, now aligned with verified registration fields while retaining the architecture's secure session requirements. Replace it with coordinated shared imports when published. It does not define financial DTOs.

Adithya / integration owner must agree and publish:

- `GET /api/auth/me`: documented `{ user: { id, email, role, account_id }, csrf_token }`; known server role required, customer billing account required, CSRF nonempty. `401` means unauthenticated; transport/404/5xx/malformed responses remain visible service errors.
- Anonymous CSRF bootstrap for login/register/reset: Architecture requires CSRF on mutations but only documents token issuance for an authenticated `/auth/me`. The client can consume an explicit `X-CSRF-Token` response header on the session probe, including a `401`, **if the backend adopts that policy**. This is a proposed integration seam, not an asserted backend contract. Otherwise coordinate a public bootstrap route and update this adapter. Until a real token is issued, credential submission is unavailable. Never fabricate tokens or exempt public writes implicitly.
- `POST /api/auth/login` uses email/password; success is followed by `/auth/me`, which alone grants application access. Registration now follows the inspected backend schema: email/password only, with validated `{account_id,user_id,role:"CUSTOMER"}` response. Account creation does not imply a session. Raw login response credentials are discarded.
- `POST /api/auth/logout` revokes the server session; local state clears only after success. An API `401` also invalidates local session state.
- Forgot/reset password request fields, reset token URL convention, neutral response envelope, provider delivery versus `PREVIEW_ONLY`, and CSRF bootstrap are not frozen. The recovery routes and accessible forms are present but submission stays unavailable until agreement. No reset request is made and no delivery/password-change success is fabricated. `/reset-password?token=...` currently recognizes the conventional query key only for an unavailable-state message; coordinate its final URL format.

All requests use `credentials: include`, same-origin `/api`, JSON, a 15-second deadline, caller cancellation, and safe normalized errors. Mutations require `X-CSRF-Token`. No automatic retries occur; financial features should supply and retain an `idempotencyKey` when their API contract supports it and reconcile ambiguous outcomes via a server read. No credentials or session tokens are saved in localStorage. A caller must not retry a payment merely because its response timed out.

## Validation and next milestone

Vitest covers API cookie/CSRF/error/cancellation behavior, session validation, redirects and role isolation, honest recovery states, password rules, and currency formatting. Test-only session fixtures never ship as demo authentication. Responsive CSS and native modal navigation are implemented; browser/device visual verification is a separate check if no browser tool is available.

Verified in this batch: `npm.cmd run typecheck` passed, `npm.cmd test -- --reporter=dot` passed **33 tests in 3 files**, and `npm.cmd run build` passed. Vite started on port 5173. HTTP smoke checks returned 200 with the SPA entrypoint for `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/app/overview`, and `/portal/home`; these are serving checks, not proof of backend authentication. `/api/auth/me` returned the expected proxy 500 because no backend is running. No browser automation/preview tool was available, so visual layout, native dialog focus behavior, and device-width checks remain unverified in a real browser.

Next milestone: freeze shared auth/CSRF/reset contracts with Adithya, connect the real auth service, and verify registration → sign-in → role redirect → logout and real/preview reset behavior. Then integrate the P0 customer/subscription list and detail APIs with server pagination and allowed lifecycle actions. Reporting, invoices, and payments follow; P1 remains deferred.

## Phase 1 files

For the later authentication checkpoint, see [confirmed contracts and remaining backend blockers](src/features/auth/INTEGRATION.md). The checked-in backend currently lacks CSRF bootstrap/enforcement and a compatible session envelope; real browser registration/login remains unavailable. The Phase 1/2 verification notes above describe their respective implementation batches, not a live backend authentication result.

All files in this batch are new and inside `frontend/`; pre-existing documentation and teammate-owned directories remain untouched.

| Directory | Files |
| --- | --- |
| `frontend/` | `.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts` |
| `src/app/` | `main.tsx`, `router.tsx`, `AppShell.tsx`, `Brand.tsx`, `navigation.ts`, `NetworkNotice.tsx` |
| `src/styles/` | `global.css` |
| `src/components/ui/` | `Button.tsx`, `Input.tsx`, `Select.tsx`, `StatusBadge.tsx`, `Money.tsx`, `PageHeader.tsx`, `LoadingSkeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `index.ts` |
| `src/components/data/` | `MetricCard.tsx`, `index.ts` |
| `src/lib/api/` | `client.ts`, `index.ts` |
| `src/lib/format/` | `index.ts` |
| `src/features/auth/` | `AuthPages.tsx`, `AuthProvider.tsx`, `ProtectedRoute.tsx`, `contract.ts`, `service.ts` |
| `src/features/customer/` | `PortalHome.tsx` |
| `src/features/dashboard/` | `WorkspaceHome.tsx` |
| `src/tests/` | `setup.ts`, `api.test.ts`, `auth-routing.test.tsx`, `format-and-contract.test.ts` |
