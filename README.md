# StudySync

StudySync is a responsive student study-partner and collaboration app. Students describe what they are studying, their learning preferences, goals and recurring availability; discover compatible students; connect by mutual consent; form study groups; and schedule sessions in each participant's own time zone.

## Current delivery status

The React interface, route guards, Supabase client modules, PostgreSQL migration files, and Supabase Edge Function sources are present. `pnpm typecheck` and `pnpm build` pass; the production output has route-level chunks with no oversized-chunk warning. The preview serves its application shell and exact 20-route `/manus-routes.json` with HTTP 200. All five SQL migration files pass statement-level parsing, but they have not been executed against PostgreSQL.

This repository is **not connected to a Supabase project yet**. Real signup, data persistence, matching, notifications, migrations and Edge Functions are therefore not live or end-to-end verified. The exact credentials/settings needed are described below. No two-account journey has been claimed as tested. Supabase CLI/PostgreSQL/Deno runtimes were unavailable in the sandbox. The terms/privacy pages contain launch placeholders; replace them with approved organizational/legal content before public use.

## Stack

- React 18, TypeScript, Vite, Tailwind CSS 3 and custom responsive CSS
- Supabase Auth, PostgreSQL, private Storage bucket and authenticated Edge Functions
- TanStack Query for request state and invalidation; React Hook Form/Zod for account forms
- Vercel static hosting with SPA rewrites

## Requirements

- Node.js 20 or newer
- pnpm 11.25.0 (the `packageManager` field pins the expected package-manager version)
- A Supabase project and Supabase CLI for schema/function deployment
- A Vercel account for deployment

## 1. Configure Supabase

1. Create a Supabase project. In **Project Settings → API**, copy its project URL and public publishable/anon key.
2. In the repository root, copy `.env.example` to `.env.local` and set only:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
   ```

   These browser values are public. **Do not put a service-role key in a `VITE_` variable, `.env.local`, a Vercel browser variable, or any client file.** Never commit `.env.local`.

3. In Supabase **Authentication → URL Configuration**, set the development site URL (for example `http://localhost:3000`). Allow that origin and your production/preview origins. The app sends confirmation links to `/onboarding` and password-reset links to `/reset-password`; configure those as allowed redirect URLs. Enable email confirmation when appropriate. Configure production SMTP so account emails deliver reliably.
4. Apply versioned database migrations from the repository root:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   Review the SQL before applying it. It creates normalized student profiles, subjects, preferences, goals, timezone-aware availability, connections, groups, sessions, invitations and notifications; enables Row Level Security; installs owner/participant-only policies and atomic authorization-checking RPCs; and creates a private `avatars` storage bucket. The project database is shared by development, staging and production, so use a dedicated test project for destructive tests.

5. Deploy the authenticated server-side functions:

   ```bash
   supabase functions deploy match-students
   supabase functions deploy delete-account
   ```

   The matching function checks the caller JWT and uses a server-only Supabase service key to read only eligible discoverable profiles, calculate scores and return privacy-safe results. Its compatibility score is calculated from real records: shared subjects **40%**, future two-week timezone-aware availability overlap **25%**, shared goals **20%**, and shared learning preferences **15%**. It uses a Jaccard similarity for the categorical factors. Exact recurring availability stays server-side; only the overlap score and explanation are returned. Because subjects and goals contribute to the overall score, students who hide either input are omitted from match results so their hidden values cannot be inferred from the aggregate; their shareable profile still redacts those fields.

   The account-deletion function verifies the caller JWT and current password, removes the verified user's private avatar files, then deletes only that user's Auth record (linked PostgreSQL rows cascade). It requires `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in the Supabase Edge Function runtime. Supabase generally supplies project values to functions; confirm the service-role secret is available in **Edge Function secrets**. If you must configure it, use Supabase's protected secrets UI. **Never put it in this repository or a browser environment variable.**

6. Verify both functions are deployed with JWT verification enabled (see `supabase/config.toml`). The private avatar bucket and its path-owner policies are defined by the migrations. No public contact details or exact availability are exposed.

## 2. Local development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. If Supabase environment variables are not set, the marketing pages remain available and account forms explain that authentication needs project configuration; authenticated features will not operate.

Useful commands:

```bash
pnpm typecheck  # TypeScript project check
pnpm build      # strict typecheck plus optimized Vite production build
pnpm preview    # serve the production output locally on port 3000
```

The Vite server also serves a route manifest at `/manus-routes.json`. Add any newly implemented page patterns there, excluding assets, APIs and 404-only routes.

## 3. Two-account end-to-end verification runbook

Use a **dedicated non-production Supabase project** with functioning email delivery and two distinct inboxes/sessions. These steps are a runbook, **not a statement that the hosted journey has already passed**:

1. Register Student A and Student B with separate addresses; confirm each email if verification is enabled; test login, logout, forgot-password email and the reset-password redirect.
2. Complete both onboarding flows with distinct real subjects/goals/preferences and recurring availability in different, explicitly selected IANA time zones. Update each profile and reload to check persistence.
3. Call `/discover` as both students. Check the scores against the stored data and weights (40/25/20/15); confirm there are no random compatibility values and neither profile's exact availability is returned.
4. As A, send B a request. As B, accept; check both connection views and persistent notifications. On disposable test pairs, separately verify decline, requester cancel, and blocking/unblocking.
5. Create a capacity-limited group as A, request membership as B, approve as A, and check active/pending owner controls and capacity limits.
6. Schedule a future session as A, invite B, verify it displays in both local time zones, accept/decline as B and cancel as A; verify persisted notifications.
7. As B, attempt requests for A's private profile/availability and another user's notification/profile mutation; verify RLS/RPC rejects unauthorized access. Hide an academic field and subjects/goals in A's profile privacy settings; confirm sanitized profile responses and direct table reads respect those choices, and confirm A is omitted from score-bearing discovery when a weighted input is hidden. Toggle A's overall visibility and confirm the public share route stops exposing it when it is not discoverable.
8. Only with disposable data, re-authenticate and test secure account deletion; verify the deleted account cannot sign in and its linked rows/avatar objects (including a test account with more than 100 stored objects) are gone.

If a verification email or reset email does not arrive, configure Supabase SMTP and allowed redirect URLs before treating the test as failed.

## 4. Deploy on Vercel

1. Import the repository into Vercel. Use **Other** or **Vite** framework detection. `vercel.json` declares `pnpm build`, `dist`, the pinned pnpm lockfile install, and a client-side history rewrite.
2. In Vercel **Project Settings → Environment Variables**, set only browser-safe values for Production, Preview and Development as needed:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Do not add `SUPABASE_SERVICE_ROLE_KEY` to Vercel's frontend build. The privileged functions run in Supabase, not in Vercel.

3. Update Supabase Authentication **Site URL** and allowed redirect URLs to include the deployed Vercel origin and the paths `/onboarding` and `/reset-password`. Include Vercel preview domains only if you intend to test there.
4. Deploy and verify signup-email confirmation, password-reset callbacks, database migrations, Edge Functions and storage in the hosted origin. Changing environment variables requires a new Vercel build.

To deploy from the Vercel CLI instead:

```bash
pnpm dlx vercel
pnpm dlx vercel --prod
```

Vercel deployment was not performed as part of this source implementation.

## 5. Publish through Manus Webdev

The bound Manus Webdev project uses a separate container deployment contract. Its `Dockerfile` builds the Vite app with the pinned Node and pnpm versions and committed lockfile; `server.mjs` serves the production SPA on `PORT` (default `3000`) and returns an unauthenticated `200` from `/_health`. The Webdev project configuration declares this Dockerfile and health path. This path is independent of the Vercel setup above; neither deployment path embeds a Supabase service-role key.

Before relying on signup, password recovery or authenticated workspace actions, configure the production browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for the intended Supabase project and deploy a new version. Do not copy development credentials into production. Without these values, the UI intentionally explains that authentication is paused.

## Repository map

```text
src/
  app/                  Routes and authentication/onboarding guards
  components/           Brand mark, accessible controls and workspace shell
  features/auth/        Supabase session provider and auth forms
  features/discover/    Match cards with weighted score explanations
  lib/                  Browser Supabase client, data services, types, validators and helpers
  pages/                Marketing, onboarding, dashboard, discovery, groups, planner, profile/settings
  styles.css            Responsive dark-navy/violet design system
supabase/
  migrations/           Ordered PostgreSQL schema, constraints, indexes, RLS and RPCs
  functions/            Authenticated matching and secure account-deletion functions
.env.example            Public browser configuration template; no privileged credentials
vercel.json             Static Vite output and SPA rewrites
public/manus-routes.json Page-route manifest
```

## Privacy and launch checklist

Profile visibility, per-field share settings, connection consent, exact availability privacy, avatar controls, notification preferences and verified deletion are implemented as product controls in source; they still need integration verification against the chosen Supabase project. Replace placeholder terms/privacy copy and `support@studysync.example` with an approved privacy notice, legal terms, support address, retention policy and operating entity before launch. Configure production SMTP, rate limits and backups in Supabase. Review Vercel/Supabase billing and data-region choices independently.
