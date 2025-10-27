<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repo -->
# Copilot / AI agent instructions — Timy Time (ToDoList)

Keep suggestions concise and repository-specific. This is a small static frontend project (single-page-ish) that uses Firebase Hosting and client-side JavaScript. Use the concrete examples and file references below when making edits or suggestions.

Key facts (quick):
- Tech: static HTML/CSS/vanilla JavaScript. No frontend frameworks. See `public/` for all page files.
- Hosting: Firebase Hosting is configured. See `firebase.json` (public directory = `public`, rewrites -> `index.html`).
- Auth & DB: The app uses Firebase Auth (Google, Facebook, Email flows) directly in client code (see `public/main.js`).
- No build step: there is no package.json or bundler in the repo — changes are applied directly to files under `public/` and deployed to Firebase Hosting.

Project layout to reference:
- `public/` — static site root. Important files:
  - `public/index.html` — SPA landing page referenced by hosting rewrites.
  - `public/main.js` — splash & auth logic (Google/Facebook/Email flows). Contains global functions: `googleLogin()`, `facebookLogin()`, `emailLogin()`, `emailSignup()`.
  - `public/task.js` — calendar, task UI, custom dialog and time-picker logic. Exposes `window.showCustomDialog` (used across pages).
  - `public/pages/` — page fragments (login, signup, profile, task, etc.).
  - `public/styles/` — per-page CSS; follow existing naming conventions (e.g., `profile.css`, `task.css`).

Concrete patterns and conventions to follow:
- DOM-first, imperative style: modify elements directly via `document.getElementById` / `querySelector` and attach listeners. Keep new code consistent with this approach (avoid introducing frameworks or build tooling).
- Global helpers: the code intentionally uses a few global functions for cross-page features (e.g., `window.showCustomDialog`). If you add cross-page utilities, attach them to `window` and document usage.
- Defensive DOM checks: many scripts check for element existence before operating (e.g., `if (calendarContainer && monthYearDisplay) { ... }`). Mirror that pattern to avoid runtime errors when a script is included on pages without all elements.
- Fixed test dates: `public/task.js` generates dates from a hardcoded start (`new Date('2025-01-01')`). Be careful when changing calendar generation logic; tests and manual QA should verify expected positions/IDs (date card IDs follow pattern `date-YYYY-M-D`).
- UI flows use CSS classes to toggle states (e.g., `.open`, `.active`, `.fade-out`, `.mobile`/`.desktop`). Use the same pattern when adding behavior.

Integration points & external dependencies:
- Firebase client SDK is used directly in `public/main.js` (auth flows). Do not assume a server-side component; changes to auth flows typically require updating client code and Firebase project configuration (not in repo).
- Firebase Hosting is configured in `firebase.json`. Deployers likely use the Firebase CLI (`firebase deploy` / `firebase emulators:start`) — mention this in PR notes if deployment-related changes are included.

Developer workflows to document in PRs / commits:
- Static edits: modifying pages, JS, or CSS — test by opening files locally (open `public/index.html` or the specific `public/pages/*` page) or run the Firebase emulator/serve before deploy.
- Deployment: repo relies on Firebase Hosting. If a PR changes routing, index.html, or assets, call that out and include any Firebase CLI commands in the PR description.

What to reference in suggestions or code edits (examples):
- When changing authentication, reference `public/main.js` functions `emailLogin`, `emailSignup`, and provider flows. Keep the same promise-based `.then/.catch` patterns and user-facing alerts used in the codebase.
- When modifying task/calendar behavior, reference `public/task.js` functions: `generateCalendar`, `setupCalendarScroll`, `updateMonthYearDisplay`, and `createTaskCard`. Preserve ID and class conventions (`date-YYYY-M-D`, `.date-card`, `.task-card-item`, `#calendar-cards-container`).
- When adding a global dialog or picker, follow the `window.showCustomDialog` implementation: use a shared overlay element, populate actions dynamically, and return early if required DOM elements are missing.

Quality gates for changes:
- Ensure no new runtime exceptions in the browser console for pages that include modified scripts. Prefer adding a defensive `if (element) { ... }` guard when referencing DOM elements.
- Keep changes localized; because there is no bundler, a large refactor should be accompanied by a manual smoke test checklist in the PR describing which pages to open and what to try.

If you cannot determine intent from existing files:
- Prefer minimal, reversible edits and add clear comments describing assumptions. Example: if adjusting calendar start date, add a comment explaining the reason and the expected visible behavior.

Files to look at for examples:
- `README.md` — project description and tech stack.
- `firebase.json` — hosting and rewrite behavior (SPA index rewrite).
- `public/main.js` and `public/task.js` — primary behavioral patterns, global functions, defensive DOM checks, and UI toggles.

When updating this document: preserve any existing human-written notes and only add or replace factual, discoverable content. If you detect missing workflows (e.g., deployment credentials or build steps), leave a short TODO note in the PR rather than embedding secrets or unknown commands.

— End of instructions —
