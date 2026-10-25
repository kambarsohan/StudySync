# StudySync 🎓⚡

[![Deploy StudySync to GitHub Pages](https://github.com/kambarsohan/StudySync/actions/workflows/deploy.yml/badge.svg)](https://github.com/kambarsohan/StudySync/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-18.3-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%2017-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**StudySync** is a modern web platform designed to help university students discover compatible study partners, form focused study groups, and schedule collaborative study sessions with timezone synchronization.

🚀 **Live Demo:** [https://kambarsohan.github.io/StudySync/](https://kambarsohan.github.io/StudySync/)

---

## 🌟 Key Features

* **Intelligent Study Matching Engine:** Computes weighted compatibility scores based on:
  * Shared Subjects (**40%**)
  * Timezone-aware Availability Overlap (**25%**)
  * Shared Academic Goals (**20%**)
  * Learning Style Preferences (**15%**)
* **Mutual Consent Connection System:** Send, accept, decline, cancel, or block student requests with zero duplicate records and atomic PostgreSQL constraints.
* **Focused Study Groups:** Create capacity-limited study circles (2–100 students) with owner moderation controls, approval queues, and member rosters.
* **Timezone-Aware Study Planner:** Schedule sessions in your local timezone; invitations are saved in UTC and automatically rendered in invitees' local timezones.
* **Persistent In-App Notifications:** Real-time event notifications for requests, approvals, and session invites with per-user notification preferences.
* **Field-Level Privacy Safeguards:** Granular controls over which profile fields are public. Exact availability and learning preferences remain private on the server.
* **Secure Account Lifecycle:** Re-authenticates with current password before cascading account deletion via Supabase Edge Functions.

---

## 🚀 One-Click Deployments

Deploy your own instance of StudySync with a single click:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkambarsohan%2FStudySync&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&project-name=studysync&repository-name=studysync)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/kambarsohan/StudySync)

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript 5.7, Vite 6, React Router DOM 6.28 |
| **State & Cache** | TanStack React Query v5, React Context (`AuthProvider`) |
| **Forms & Validation** | React Hook Form, Zod, Hookform Resolvers |
| **Styling & Icons** | Tailwind CSS 3.4, PostCSS, Lucide React, Sonner Toasts |
| **Timezone & Dates** | `date-fns`, `date-fns-tz` |
| **Backend & DB** | Supabase (PostgreSQL 17, GoTrue Auth, Storage bucket) |
| **Serverless Functions** | Supabase Edge Functions (Deno runtime, JWT verification) |
| **Hosting & CI/CD** | GitHub Actions, GitHub Pages, Vercel SPA configuration |

---

## 💻 Local Development Setup

### Prerequisites
* [Node.js 20+](https://nodejs.org/)
* [pnpm 11+](https://pnpm.io/) (`npm install -g pnpm@11.25.0`)
* A Supabase project (free tier available at [supabase.com](https://supabase.com))

### 1. Clone the repository
```bash
git clone https://github.com/kambarsohan/StudySync.git
cd StudySync
```

### 2. Install dependencies
```bash
pnpm install --frozen-lockfile
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

### 4. Apply database migrations
Apply the 5 migration scripts located in `supabase/migrations/` using the Supabase CLI or the Supabase SQL editor:
```bash
supabase db push
```

### 5. Deploy edge functions
```bash
supabase functions deploy match-students
supabase functions deploy delete-account
```

### 6. Run local development server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

```bash
# Typecheck TypeScript codebase
pnpm typecheck

# Run production build
pnpm build

# Preview production build locally
pnpm preview
```

---

## 🔒 Security & Privacy Architecture

* **Row Level Security (RLS):** Enabled across all 12 database tables.
* **Atomic Transactions:** State changes execute via `SECURITY DEFINER` stored procedures.
* **No Client Secrets:** All privileged keys reside strictly within Supabase Edge Function environment variables.
* **MIME Verification:** Profile avatar uploads are restricted to `image/jpeg`, `image/png`, and `image/webp` (max 3 MB).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
