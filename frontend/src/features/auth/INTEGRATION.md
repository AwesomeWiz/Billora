# Authentication integration checkpoints

## Current live checkpoint — 31 October 2026

The earlier source-only inspection below is historical and superseded by this live check. The current backend mounts `/api/auth/csrf`, register, login, me and logout. A disposable SQLite database, real Uvicorn HTTP requests and real Edge through the Vite proxy verified CSRF issuance, credential writes, cookies and logout. No backend files, session identities or authorization dependencies were patched.

The frontend now calls the confirmed `GET /api/auth/csrf` after `/api/auth/me` returns 401, validates `CsrfOut.csrf_token`, and retains that server-issued value in memory for cookie-authenticated mutations. Failed/malformed/aborted bootstrap cannot grant a session or enable writes with a fabricated token. A valid session uses the authenticated `/me` token directly. Registration follows real `RegisterOut` and redirects to sign-in without claiming a session. Login ignores `LoginOut.detail` as identity and always probes `/me`.

`GET /api/auth/me` now returns `{user:{id,account_id,email,role},csrf_token}`. The backend regression test verifies the returned user ID matches the authenticated user and checks the remaining identity and CSRF fields. The earlier live browser audit predates this response change and should be rerun before claiming that full frontend sign-in has been verified against the current backend.

The backend requires a matching `X-CSRF-Token` and `csrf_token` cookie on mutations and currently allows only `http://localhost:5173` as Origin. Login sets an HttpOnly `session_token`; CSRF tokens are not session-bound or rotated, and the auth cookies do not set `Secure` explicitly. These deployment and CSRF-hardening details still need review. Password recovery remains absent.

See [the P0 status matrix and exact backend handoff](../../app/P0_INTEGRATION.md) and the opt-in [real HTTP/browser audit](../../tests/live_backend_checkpoint.py). Real registration and the missing-ID refusal were checked in Edge with no request interception. ADMIN/STAFF successful redirects, protected refresh and the AppShell sign-out button remain unverified against real identities; automated provider tests do not replace that evidence.

## Historical source-only checkpoint

The following records the old inspection boundary and its then-unresolved issues, not the latest backend state.

Status: verified frontend compatibility fixes are implemented; real registration/login remains blocked. No CSRF bypass, bearer-token fallback, session fabrication, or backend/shared-contract edits are included.

## Inspection boundary and Git preservation

`git fetch origin main` completed. Inspected remote `origin/main` is `7227141183f325df2a957c934f53a08401fed1fd`; it is an ancestor of local `main`, which already contains the four Phase 2 commits `4ac56c5`, `c760405`, `7400ea7`, `b35f1fa`. No merge, reset, rebase, branch creation, or push was needed. The backend on remote main matches the local backend. The unrelated root `package-lock.json` was left untouched.

Source inspection used `backend/app/api/auth.py`, `backend/app/schemas/auth.py`, the models, and core/security/config/db files in read-only mode, alongside `docs/PRD.md`, `docs/ARCHITECTURE.md`, and `docs/DESIGN.md`. There is no checked-in OpenAPI definition or FastAPI application entrypoint/router mount. `GET http://127.0.0.1:8000/openapi.json` produced no live response. Therefore the following are **source-declared contracts, not observed successful runtime requests**. The router prefix is `/auth`; configuration declares `/api`, but the `/api` application mount cannot be verified from this checkout.

## Confirmed source contracts and frontend behavior

| Endpoint under intended `/api` mount | Checked-in request / response | Frontend handling |
| --- | --- | --- |
| `POST /auth/register` | Request `{email,password}`. `RegisterOut`: `{account_id:string,user_id:string,role:Role}`. Handler always creates `CUSTOMER`. No `name` field is accepted/stored by this handler. | Form and request projection now send only email/password. A nonempty account ID, user ID, and CUSTOMER role must be returned before account-created success is shown. Registration never grants a session. |
| `POST /auth/login` | Request `{email,password}`. `LoginOut`: `{access_token:string,token_type:"bearer"}`; sets `session_token` cookie. | Cookie request only. Response token is discarded, never returned by the service to the auth provider, stored, logged, sent as Authorization, or reused for CSRF. A verified `/auth/me` is still mandatory. |
| `GET /auth/me` | Unmodeled dict `{account_id,email,role}`; no user ID or CSRF token. | Explicit unsupported-session error. Account ID is never substituted for user ID. No protected route is granted from this incomplete shape. |
| `POST /auth/logout` | No body; `{detail:"logged out"}`. Tries to revoke the cookie's session, then deletes `session_token`. | Existing guarded POST is retained, body ignored, and local session clears only after HTTP success. The backend cookie mismatch below prevents trusting live revocation until fixed. |
| `GET /auth/csrf` | No route or response schema exists. | No speculative call or fabricated token. Credential forms remain unavailable without server-issued CSRF. |
| Forgot/reset password | No routes, schemas, reset-token model or delivery implementation exists in the fetched tree. | Existing recovery forms remain explicitly unavailable; no email or password-change success is claimed. |

The Pydantic password validator requires at least 9 Unicode characters, at least one lowercase and uppercase character, and at least one symbol from `!@#$%^&*()-_=+[]{}|;:,.<>?/`; it imposes no digit requirement. Frontend validation now uses that symbol set, Unicode character counting, and Unicode uppercase/lowercase properties. Unsupported symbols do not silently pass client validation. The server remains authoritative.

FastAPI HTTP exceptions use `{detail:string}` (for example invalid credentials and duplicate email), while validation uses `{detail:[...]}`. The shared client now presents 4xx detail strings, preserves the architecture's normalized error envelope, strips submitted `input` and nested context from retained FastAPI validation details, and avoids retaining 5xx trace details. Cookies, mandatory `X-CSRF-Token`, cancellation, and no automatic mutation retries are unchanged.

## Confirmed backend blockers

1. **No CSRF or Origin validation implementation.** The router has no CSRF dependency, issuance, or Origin/Referer checks; `core/security.py` is only a placeholder. No middleware/application file is present that could establish the missing policy. Sending an arbitrary header cannot make this secure; the frontend guard remains mandatory.
2. **Cookie name mismatch.** Login sets `session_token` with explicit `httponly=True`, `samesite="lax"`, `max_age=3600`. `/me` and logout declare `token: str = Cookie(None)` without an alias, which reads a cookie named `token`. Logout deletes `session_token`, so this source pairing cannot consistently authenticate or revoke the issued session. The setter does not explicitly specify Secure, Path, Domain or Expires; no live Set-Cookie header was observed. Agree consistent cookie/path behavior and require Secure for HTTPS.
3. **Incomplete runtime implementation.** `api/auth.py` imports `models.user_session.UserSession`, but that file is absent. It imports hashing/session functions that the placeholder security module does not define. `func.now()` is used without importing `func` in the auth router. There is no FastAPI application entrypoint or router registration. These prevent treating the endpoint declarations as a working service. Backend ORM result handling, SQLite event wiring and driver dependencies also need backend-owner verification before an end-to-end claim; no backend code was executed or repaired here.
4. **Incomplete session identity contract.** `/me` lacks user identity and CSRF; login returns a raw session credential in JSON instead of the architecture's cookie-only identity flow. The frontend will not weaken session validation or convert this into bearer authentication.
5. **Password recovery is absent.** Its neutral response, token expiry/single-use handling, CSRF and real delivery/preview status must be agreed and implemented before enabling the existing forms.

## Exact backend contract required before enabling real browser authentication

This is a proposed coordination target, **not a new shared contract or a claim of implementation**:

1. Implement and document a public same-origin **`GET /api/auth/csrf`** (or explicitly agree an equivalent issuance mechanism). With `credentials: include`, return `200 {"csrf_token":"<server-generated CSRF value>"}`, `Cache-Control: no-store`, and the necessary HttpOnly pre-authentication cookie. Bind the CSRF value to server-side pre-auth/session state. It must be distinct from the opaque authentication credential. A tokenless anonymous `/me` 401 alone cannot bootstrap protected writes. Once the route is confirmed, the frontend can add this explicit bootstrap request; it does not call an absent route today.
2. Validate cookie-bound `X-CSRF-Token` **and trusted browser Origin** for register, login, logout, reset and every other mutation. Reject missing/invalid tokens and untrusted origins. Agree missing-Origin/Referer policy. Preserve the original browser origin through the Vite proxy; do not use wildcard credentialed CORS or expect the browser frontend to manufacture an Origin header.
3. Use one agreed HttpOnly cookie name consistently for issue, read, revoke and delete; set SameSite, lifetime, path and HTTPS Secure explicitly. Rotate the pre-authentication state and CSRF value after login. Revoke the server session on logout, rather than only clearing a browser cookie.
4. Return the architecture's **`GET /api/auth/me`** envelope: `{ "user": { "id": "<real user ID>", "email": "...", "role": "ADMIN|STAFF|CUSTOMER", "account_id": "<customer account ID or null>" }, "csrf_token": "<current session-bound value>" }`. Return 401 for anonymous/expired sessions. Customer account identity must be nonempty. Do not return raw authentication credentials. Login may return non-secret identity or no content; the frontend still revalidates `/me` before access.
5. Keep verified registration `{email,password}` → `{account_id,user_id,role:"CUSTOMER"}` and publish recovery and error schemas through the application OpenAPI/shared-contract coordination. Resolve import, session-model and ORM/runtime blockers so this contract can be exercised against a running service.

Until these are implemented and checked against a live OpenAPI document, **real registration/login cannot safely be tested through the frontend**. The relevant automated tests use explicitly test-only responses and never enable production mock authentication.

## Validation and change scope

Frontend-only changes cover the API error adapter, auth request/response adapter, registration form and password rules, explicit unavailable messaging, and regression tests. Phase 2 app routes, customer/subscription code, and their tests remain unchanged. No shared API contracts or backend files were modified.

`npm.cmd run typecheck` passed. `npm.cmd test -- --reporter=dot` passed **93 tests in 8 files**, including all 43 Phase 2 tests. `npm.cmd run build` passed. These are frontend checks with test-only API responses; no live registration, login, logout, cookie-header or password-recovery success is claimed. The backend's absent CSRF bootstrap and incompatible session identity are explicitly covered by refusal/disabled-state tests.
