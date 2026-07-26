# Canvas Upload and Persistent Auth Session Design

## Goal

Remove the extra confirmation step from the first room-photo upload and make
Google authentication persist correctly across public and private navigation.

The successful flow is:

1. A signed-in user opens `/app/[id]`.
2. The empty canvas accepts a click, file selection, or drag-and-drop.
3. Upload starts immediately and the local image appears on the canvas.
4. The server-processed image replaces the local preview without navigation.
5. The same page exposes the editor, generation settings, history, and profile
   navigation.
6. Returning to `/` or `/login` does not ask the user to authenticate again
   while the Supabase session is valid.

## Scope

### Included

- Immediate source upload after file selection or drop.
- Upload, processing, success, retry, and replacement states inside the canvas.
- No separate “Save photo” action.
- No route change after source upload.
- Supabase access-token lifetime of 24 hours.
- Supabase session lifetime of 30 days.
- Automatic access-token refresh through `@supabase/ssr` cookies.
- Server-side protection for `/app`, `/app/*`, `/admin`, and `/admin/*`.
- Auth-aware behavior on `/` and `/login`.
- Regression tests for upload state transitions and auth routing decisions.

### Excluded

- A custom JWT issuer or a second refresh-token database.
- Storing auth tokens in `localStorage`.
- Resumable/chunked uploads.
- A pre-upload crop or image editing step.
- Changes to Google provider scopes.

## Canvas Upload Design

The empty project keeps the canonical URL `/app/[id]`. Its central canvas area
is the upload target rather than a separate card or step.

When a valid file is selected:

1. The browser creates an object URL and renders it immediately in the canvas.
2. The upload request starts automatically.
3. The canvas displays a processing overlay and prevents duplicate submissions.
4. The source endpoint validates, normalizes, and stores the image.
5. On success, the page refreshes its server data without navigation. The
   processed signed URL replaces the object URL and the full editor activates.
6. The object URL is revoked when it is no longer needed.

The project name may still be derived from the first file name, but this
secondary request must not block activation of the editor.

### Error handling

- Client-side type or size errors are shown before network upload.
- Server errors keep the local preview visible.
- The user can retry the same file or choose another file.
- Replacing an existing photo uses the same immediate-upload behavior.
- A stale request must not overwrite the state of a newer selected file.

## Authentication Design

Supabase Auth remains the single authentication authority. The Supabase access
JWT and refresh token are stored by `@supabase/ssr` in cookies so Server
Components, Route Handlers, and the browser share one session.

### Token policy

- Access-token JWT expiry: 86,400 seconds (24 hours).
- Session time-box: 2,592,000 seconds (30 days).
- Refresh rotation remains managed by Supabase.
- Explicit logout calls `signOut`, clears the auth cookies, and revokes the
  active refresh session.

The application does not expose the service-role key or create its own refresh
token. Authorization never trusts client-controlled user metadata.

### Refresh flow

The Next.js proxy runs for application pages and API requests except immutable
static assets. It creates the Supabase server client and immediately calls
`auth.getClaims()`. When Supabase refreshes an expired access token, `setAll`
copies the new cookies to both the current request and the outgoing response.

The proxy performs only a fast route-level redirect. Every protected Server
Component and Route Handler continues to verify identity with
`requireCurrentUser`; proxy protection is not the sole authorization layer.

### Route behavior

- `/app`, `/app/*`, `/admin`, `/admin/*`: anonymous users go to
  `/login?next=<safe-path>`.
- `/login`: authenticated users go to `/app`.
- `/`: renders an auth-aware call to action. Authenticated users see
  “Continue” linked to `/app`; anonymous users see the Google sign-in entry.
- OAuth callback accepts only a local safe `next` path.

## Component Boundaries

- `SourceUpload`: owns file selection, immediate request lifecycle, retry, and
  replacement behavior.
- `EmptySourceWorkspace`: places `SourceUpload` directly in the canvas shell.
- Auth route helpers: classify protected/public routes and build safe redirects
  without depending on Next.js request objects.
- Supabase proxy adapter: refreshes cookies and applies route decisions.
- Server pages: render auth-aware homepage/login state and independently verify
  protected content.

## Testing

Tests should cover:

- File selection immediately invokes upload once.
- Drag-and-drop follows the same path.
- Success refreshes project data without `router.push`.
- Failure preserves preview and permits retry.
- A second selection prevents stale completion from winning.
- Protected-route classification includes nested app/admin paths.
- Safe `next` handling rejects external and protocol-relative URLs.
- Authenticated `/login` and homepage behavior do not offer a second login.

Before release, run Prisma validation, type checking, linting, production build,
and browser verification of:

1. Google login.
2. Return to homepage and re-entry without login.
3. First-photo automatic upload.
4. Retry/replacement behavior.
5. Access to history/profile.

## Acceptance Criteria

- Selecting or dropping the first photo requires no second click.
- The URL remains `/app/[id]` throughout upload and editor activation.
- Upload feedback appears within the canvas.
- A valid signed-in user can visit `/`, `/login`, and `/app` without being
  prompted to authenticate again.
- Private pages reject missing or invalid sessions on the server.
- Access JWT and session lifetime match 1 day and 30 days respectively.
- No auth token is deliberately stored in application `localStorage`.
