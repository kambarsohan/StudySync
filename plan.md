# StudySync — Implementation Plan

## Scope and architecture

Build the specified student study-buddy application in the newly initialized, empty managed Webdev workspace. The user's explicit stack remains authoritative: React, TypeScript, Vite, Tailwind CSS, Supabase Auth/PostgreSQL/Storage when needed, and Vercel deployment. This is not a marketing-only prototype. Durable behavior is backed by Supabase, never by fabricated users or random scores.

The browser app uses the official `@supabase/supabase-js` client with only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Supabase Auth restores and refreshes sessions. PostgreSQL migrations define normalized academic profiles, subjects, learning preferences, goals, availability, connections/blocks, groups/membership requests, study sessions/invitations, and notifications with foreign keys, unique/check constraints, indexes and RLS. Narrow database RPCs handle atomic capacity/session state transitions where a multi-row mutation must not race. A Supabase Edge Function authenticates matching requests and computes the requested actual-data compatibility weights (subjects 40%, timezone-aware availability 25%, goals 20%, preferences 15%), returning only discoverable students and explanation components. A separate authenticated account-deletion Edge Function obtains the caller identity from the verified JWT; its service-role key is stored only in Supabase function secrets, never in Vite/browser code. RLS protects all application records independently of UI routing.

The frontend is modular: React Router pages and route guards; shared responsive shell/design components; Zod-validated forms; query/mutation hooks; typed Supabase and domain services; and focused feature folders for onboarding, discovery/connections, groups, planner/sessions, notifications, profile/privacy and settings. Date/time data stores instants in PostgreSQL `timestamptz`, IANA time-zone identifiers, and local recurring availability ranges; scheduling displays and accepts the student's selected zone. Seed data is not used as a production fallback. Missing project credentials produce a clear setup state, not simulated success.

Delivery includes SQL migrations, Edge Functions, `.env.example`, a beginner-oriented README with Supabase setup/Auth redirect/function deployment, Vercel build/rewrites/environment instructions, and an available production build. Two-account live end-to-end/RLS validation depends on real Supabase configuration and two test accounts; report that dependency honestly if credentials are unavailable.

For the currently bound Manus Webdev project, the server capability is already enabled; therefore its separate publication path is a container. A root Dockerfile performs the production Vite build with the pinned Node/pnpm versions and committed lockfile. A minimal Node entrypoint serves the built SPA on `PORT` (default `3000`) and exposes an unauthenticated `/_health` endpoint. Keep this path distinct from Vercel and never bake Supabase credentials into the image.

## Product flows

- Public landing, sign-up, login, recovery/reset, privacy and terms routes.
- Auth and onboarding guards; five-step profile onboarding (academic profile, structured subjects/priorities, learning preferences/collaboration format, goals/primary goal, day/time-zone availability).
- Dashboard, real-data discovery and explained match scores, consent-based connection lifecycle and blocking.
- Searchable study groups with owner controls, capacity-safe membership requests, and membership state.
- Timezone-correct study-session creation, invites/acceptance/cancellation and persistent in-app notifications.
- Profile editing, field-level visibility controls, privacy settings, settings, logout and secure account deletion.

## Design

The user's newer supplied reference supersedes the earlier dark-violet color direction for the website UI. Borrow its airy mint framing, bright white surfaces, dark product typography, compact navigation, and oversized visual focal point; translate its consumer-product composition into a StudySync study-planner preview rather than copying the depicted product or its layout literally.

### Core principles
1. Focused academic workspace, with the next useful action visible before secondary detail.
2. Trust is legible: consent, visibility and match explanations stay close to the actions they govern.
3. Dense student information is calm and scannable, with the freshness of an editorial product page rather than a neon admin panel; never use invented metrics.
4. Every flow is mobile-usable, keyboard-accessible and explicit about its loading, success, empty and error states.

### Color philosophy
Use a pale mint canvas and clean white surfaces to feel bright, calm, and approachable; forest-green ink anchors the academic identity, while restrained sage-green accents signal progress and collaboration. Use near-black forest text for hierarchy, soft green-gray borders, and sufficient contrast for accessible controls. Preserve distinct success, warning, and error states.

### Layout paradigm
A responsive study workspace: the landing hero uses an oversized editorial headline beside a layered, product-shaped planner preview; compact navigation sits in a light top rail. Interior pages use a quiet white workspace surface, compact persistent sidebar on larger screens, and clear mobile navigation. The dashboard pairs a meaningful “next up” region with supporting activity and discovery summaries. Dense forms use progressive steps; tables become cards on narrow screens.

### Signature elements
- A two-page “sync mark” built from offset rounded strokes, used as a small evergreen/sage brand signifier.
- Thin green focus rails and progress markers to show step, selection and ownership without heavy decoration.
- Compatibility chips that pair a score with concise factor explanations rather than a score alone.

### Interaction and animation
Use short 140–220 ms transitions for hover, focus, disclosure and route-state changes; no parallax, autoplay or long entrance sequences. Respect `prefers-reduced-motion`. Use immediate disabled/loading states during mutations, inline validation, live status announcements and confirmation for destructive/privacy-sensitive actions. On mobile, controls remain thumb-sized and modals become full-height sheets where useful.

### Typography system
Use Manrope for expressive headings and Inter for interface/body text, with system fallbacks. Headings use compact line-height and semibold weight; body copy remains comfortable at 14–16px; numeric scores use tabular figures. Maintain visible hierarchy without oversized landing-page typography in the application shell.

### Brand essence and voice
**Positioning:** A privacy-conscious way for college students to find the right study partner, make a plan and keep each other moving. **Personality:** focused, encouraging, trustworthy.

Headlines are clear and student-centered; actions use specific verbs, not vague conversion copy. Example lines: “Your next study partner is closer than you think.” “Small plans. Shared progress.”

### Wordmark and signature color
Use a bespoke “sync mark” of two offset, open book/page shapes that meet at a shared center line, followed by the StudySync wordmark in Manrope semibold. Ownable brand color: leafy forest green `#36744F`, paired with pale mint `#DDEFE2` and white.

## Main project structure

- `src/app/`: route table, lazy page loading and auth/onboarding guards.
- `src/components/`: brand mark, accessible reusable controls and responsive workspace shell.
- `src/features/auth/`: signup/login/recovery/reset and persistent Supabase session handling.
- `src/features/discover/`: weighted compatibility cards with explanatory factor details.
- `src/pages/`: public landing/legal screens plus feature modules for onboarding, dashboard, discovery/connections, groups, planner/sessions, notifications, profile and account settings; `WorkspacePages.tsx` re-exports the route screens.
- `src/lib/`: browser-safe Supabase client, typed service calls, validation, domain types and timezone helpers.
- `src/styles.css`: responsive light mint/forest-green design system and accessibility states.
- `supabase/migrations/`: ordered PostgreSQL schema, RLS, constraints/indexes, transactional RPCs, group leave and field-level privacy projections.
- `supabase/functions/`: authenticated real-data matching and password-verified account deletion.
- `public/manus-routes.json`: synchronized route declaration for all public and workspace pages.
- `README.md`, `.env.example`, `vercel.json`: safe local/Supabase/Vercel setup and deployment materials.

## Correctness and privacy constraints

The score-bearing discovery function returns only students whose overall visibility is discoverable and whose subject and goal inputs are enabled for sharing. Since those fields have fixed 40%/20% weights, returning an aggregate score for a candidate who hides either input could disclose the hidden overlap by inference. A student may hide those fields on shareable-profile projections; while hidden, that student is omitted from buddy-match results until the score inputs are shared again. Profile settings explain this consequence. Other hidden academic fields remain redacted from match results and share routes; exact availability and learning-preference lists stay private.

Onboarding lets each student choose any valid IANA time-zone identifier, prefilling the device's detected zone only as a default and offering common suggestions. The selected zone is saved on the academic profile and recurring availability and is used to interpret planner wall-clock input. Changing it reinterprets the saved recurring local ranges, with that effect explained in the form.

The session participant RLS policy explicitly qualifies its outer `study_sessions.id` and `study_sessions.group_id` references so invitations/memberships authorize only the corresponding session. The account-deletion Edge Function repeatedly removes the first remaining avatar-object page, avoiding offset shifts when deleting batches.

## Material constraints

The workspace was inspected and had no application source or package setup; initialization was therefore necessary and no existing user code was replaced. The source attachment ended mid-sentence at the availability “Requirements:” heading. This plan preserves every visible clause and the user's continuation; it does not invent missing attachment text. No Supabase project credentials, Vercel project, or two test accounts are present in the workspace. The app will include safe setup artifacts and live integrations but cannot be honestly reported as end-to-end verified against external services until configured.
