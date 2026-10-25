# StudySync delivery outcomes

Every item remains **OPEN** until its full outcome is present and externally dependent behavior has verifiable evidence. Source code and local checks do not imply live Supabase or two-account completion.

## 1. Public site, application routes, accessibility and responsive shell — OPEN (landing/signup screenshots reviewed at desktop and mobile; authenticated pages not visually exercised)
- `/` is a landing page; `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms` are public pages.
- Authenticated pages include `/onboarding`, `/dashboard`, `/discover`, `/connections`, `/groups`, `/groups/create`, `/groups/:id`, `/planner`, `/sessions/:id`, `/notifications`, `/profile`, and `/settings`.
- `/students/:id` is an intentionally shareable public route; it exposes only fields the owner chose to share and does not reveal private user/contact data.
- Landing navigation includes Features, How it works, Benefits, Sign in, and Get started, with working internal/mobile navigation; hero copy and both requested CTAs are present and functional; feature, five-step how-it-works, trust and footer sections include the supplied subjects; no fabricated user statistics or unsupported product claims are used; all CTAs work.
- Use a clean, airy, premium product aesthetic inspired by the user's reference: pale mint framing, bright white surfaces, dark forest/near-black typography, restrained leafy-green accents, compact navigation and a polished oversized study-planner preview; adapt it to StudySync rather than copying the example product. Use reusable accessible components, clean hierarchy, subtle/reduced-motion-aware animation, usable mobile navigation and layouts for 360px+, ~768px, 1024px+ and 1440px+.
- Use semantic HTML, keyboard navigation, visible focus, proper form labels, accessible dialogs, adequate contrast, screen-reader-friendly status, reduced-motion support, and alt text for meaningful images. Provide loading, error, empty, success and toast states.
- Evidence so far: local app shell and JSON route manifest each return HTTP 200; all 20 source routes are declared; landing and signup screenshots reviewed at 1280×900 and 375×812 after the mint-and-white redesign. The signup preview displays the expected notice that live authentication is paused without Supabase credentials; screenshots do not demonstrate authenticated workspace rendering or a full user flow.

## 2. Supabase authentication, route authorization and recovery — OPEN (live project not configured)
- Implement real Supabase Auth signup, email/password login, logout, persistent session restoration/token refresh, and password recovery/reset.
- Registration asks for full name, email, password, confirm password and agreement to terms/privacy. Validate email and a reasonable password policy, provide password visibility toggle and field-specific validation, handle duplicate email/rate limiting/network failures, avoid duplicate submissions, and show email confirmation instructions when required. Never store plaintext passwords.
- Login supports email/password; no nonfunctional OAuth buttons are displayed. Recovery/reset uses the provider-supported redirect flow; invalid/expired reset links and successful changes have explicit states.
- Unauthenticated visitors are redirected to login on protected pages. Signed-in users who have not completed onboarding are sent to onboarding.

## 3. Onboarding, editable academic profiles and profile privacy — OPEN (source and migration present; live RLS/API behavior not exercised)
- Onboarding is a clear multi-step flow that permits backward/forward navigation without losing valid entries.
- Academic profile contains full name, college/university, degree/program, department/major, academic year, optional semester, short introduction and optional avatar. Do not require college email without verified institution-specific support.
- Subject selection is searchable, multi-select, supports custom subject names and priority subjects, and is stored as structured data. Examples include Python Programming, Data Structures, Mathematics, Database Management Systems, Artificial Intelligence, Machine Learning, Web Development, Statistics and Operating Systems.
- Learning preferences support multiple selections: practice problems, conceptual explanations, flashcards and revision, project-based learning, discussion and teaching others, quiet co-working. Preferred collaboration format is one-to-one, small group or either.
- Goals support multiple selections: prepare for exams, complete assignments, learn a new skill, build projects, prepare for interviews and maintain a consistent study habit; users select a primary goal.
- Students select a valid IANA time zone (prefilled from the device as a default, editable by the student) and recurring available days/time ranges interpreted in that chosen zone. Changing the zone reinterprets saved local ranges, and the form explains this. The received attachment ends at its “Requirements:” heading for availability; no further clauses from that section were available.
- Students can edit their academic profile/preferences and choose overall profile visibility (discoverable by students, accepted connections only, or private—only me). They can independently show/hide their university, degree, major, academic year, semester, introduction, time zone, subjects, goals and avatar in signed-in discovery. Field-level choices are enforced by privacy-filtered database/server responses and RLS, not by UI hiding alone. A student who hides subjects or goals is omitted from score-bearing buddy discovery while those fixed-weight factors are hidden, preventing inference from the aggregate compatibility score; the shareable profile still redacts those fields. Personal contact details and exact availability are not publicly exposed.

## 4. Data-backed buddy matching — OPEN (Edge Function source present; no Supabase deployment/two-account score test)
- Match compatibility is calculated from actual student data, never random or hardcoded, using shared subjects 40%, availability 25%, shared goals 20% and learning preferences 15%.
- Display compatibility scores with explanations, discoverable students by real matching data and privacy-conscious profiles.
- Availability matching respects the students' selected IANA time zones and chosen ranges. Students who hide subject/goal score inputs are not included in score-bearing match results; match output does not leak private fields or allow a hidden weighted factor to be inferred from the total.

## 5. Consent-based connections and blocking — OPEN (database RPC/UI source present; server behavior not integration-tested)
- Users can send connection requests and accept, decline, cancel and block through real persistent operations.
- Connection actions enforce authorization and mutual-consent rules; blocked relationships cannot continue unwanted discovery/connection interactions.

## 6. Study groups and owner controls — OPEN (migration and RPC/UI source present; capacity/RLS not integration-tested)
- Users can browse/search groups; create groups; request membership; enforce capacity limits; and provide owner controls.
- Membership requests, decisions, capacity and membership state persist and are authorized server-side.

## 7. Study planner, sessions and timezone handling — OPEN (migration/RPC/UI source present; no live multi-timezone session test)
- Users can create study sessions, invite participants, cancel sessions, and use real session details. An invitee must be able to read/respond to their own invited session; active group members may read their group's sessions, but not unrelated or one-to-one sessions.
- Scheduling is timezone-correct: persist unambiguous instants and relevant timezone identifiers, and present the appropriate local date/time to each participant.

## 8. Persistent notifications — OPEN (migration and UI source present; delivery/read persistence not exercised against Supabase)
- In-app notifications persist in the database and reflect real connection, group and session activity; users can view and update notification read state.

## 9. PostgreSQL schema, RLS and privileged account deletion — OPEN (five SQL files parse; no PostgreSQL migration/RLS runtime test)
- Use Supabase PostgreSQL with version-controlled migrations, proper foreign keys, constraints, indexes and Row Level Security policies.
- Users cannot access or modify another user's private data or unauthorized records. Enforce authorization in backend/database/Edge Function policy, not only in the UI. Keep privileged keys out of frontend code.
- Secure account deletion is a verified server-side operation. Privileged Supabase credentials are held only by the trusted function environment; associated user data and all private avatar objects are removed. Avatar deletion must not skip files when clearing more than one storage page.

## 10. Validation, setup, production build and honest handoff — OPEN (local checks pass; external journey and deployment pending)
- Validate inputs, handle loading/error/empty states, and make every visible button and form perform a real action. Use modular maintainable React/TypeScript/Tailwind/Supabase code compatible with the initialized project.
- Prepare README, `.env.example`, Supabase migration files, beginner-friendly setup instructions and Vercel deployment instructions/configuration.
- For the bound Manus Webdev project, preserve Vercel configuration and provide a container deployment using the pinned Node/pnpm toolchain and committed lockfile; serve the production SPA on `PORT` (default `3000`) with an unauthenticated `200` health response at `/_health`. Do not bake Supabase credentials into the image. Treat the Webdev deployment as complete only after its explicit publish request succeeds.
- Run the production build and fix errors.
- Test with at least two separate test accounts through registration, profile setup, matching, connection requests, group membership, session scheduling, notifications and privacy restrictions.
- Do not claim features or tests complete unless they work. Report missing credentials, integrations, failed tests and unfinished features clearly. Prioritize a working end-to-end core and preserve all existing work while completing modules incrementally.
- Local evidence after the audit corrections: `pnpm typecheck` and `pnpm build` pass; optimized chunks are each below 500 kB with no large-chunk warning; the SPA root and exact 20-route manifest return HTTP 200; all five SQL migration files pass a PostgreSQL statement-level parse; source-level checks confirm the corrected session RLS references the outer session row. These checks do not execute PostgreSQL policies or Supabase Edge Functions.
- Still blocked: there is no Supabase project URL/key or test accounts in this workspace; no Supabase CLI, local PostgreSQL or Deno runtime was available. SQL parser success does not prove migration execution or RLS behavior. No two-account live test, Vercel deployment or legal review was performed.
