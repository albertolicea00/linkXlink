# Setup Guide 🛠️

Step-by-step to get Link x Link running — from Supabase to production on Netlify.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [A. Supabase (backend)](#a-supabase-backend)
- [B. Netlify (deploy)](#b-netlify-deploy)

---

## Prerequisites

- Node.js >= 20
- A [GitHub](https://github.com) account
- A [Supabase](https://supabase.com) account (free tier)
- A [Netlify](https://netlify.com) account (free tier)
- This repo cloned locally:
  ```bash
  git clone <repo-url>
  cd linkxlink
  ```

---

## A. Supabase (backend)

### 1. Create a project

- Go to <https://supabase.com>
- **Start a project** → pick the closest region, set a strong DB password, free tier is fine.
- Wait for the database to provision (~1–2 min).

### 2. Run the migration

- Dashboard → **SQL Editor**
- Open `supabase/migrations/0001_init.sql` from this repo and paste its full contents
- Click **Run** — this creates tables (`profiles`, `reports`, `admins`), the `profile-photos` storage bucket, RLS policies, and the auto-disable DB trigger.

### 3. Verify the schema

- **Table Editor** → confirm `profiles`, `reports`, `admins` exist
- **Storage** → confirm `profile-photos` bucket (should be public)

### 4. Create an admin user

- **Authentication → Users → Add user**
- Enter email + password (use a real email you can verify, or a test one)
- Copy the generated **UUID** for the next step

### 5. Register the admin

- **SQL Editor** → run:
  ```sql
  insert into public.admins (id, email)
  values ('<copied-uuid>', '<admin-email>');
  ```

### 6. Get your API credentials

- **Settings → API**
- Copy **Project URL** and **anon public key**

### 7. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

```
VITE_SUPABASE_URL=<your-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> The anon key is **public by design** — security comes from RLS, not key secrecy.

### 8. Test locally

```bash
npm install     # if you haven't yet
npm run dev
```

Walk through:

- [ ] Login at `/admin` with the admin user you created
- [ ] Create a test profile with 1–3 photos
- [ ] See it appear in the feed at `/app`
- [ ] Report it 3 times (from 3 different browsers/incognito sessions — same browser blocks duplicates) → profile must disappear from feed
- [ ] Reactivate it from `/admin`

---

## B. Netlify (deploy)

### 1. Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. `netlify.toml`

The file already exists in the repo with build command and SPA redirect rules — nothing to configure.

### 3. Import project

- Go to <https://app.netlify.com>
- **Add new site → Import an existing project**
- Connect GitHub → select your repo

### 4. Build settings

Netlify auto-detects from `netlify.toml`. Verify:

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `dist` |

### 5. Environment variables

**Before deploying**, go to **Site configuration → Environment variables** and add:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

### 6. Deploy

- Click **Deploy site**
- Wait for the green build ✅

### 7. Verify on `*.netlify.app`

- [ ] `/app` loads profiles from Supabase
- [ ] Direct routes work (e.g. open `/eula` directly — SPA redirect must work)
- [ ] WhatsApp button opens `wa.me/<number>`

### 8. PWA on mobile

- Open the Netlify URL in Android/Chrome
- **Add to Home Screen**
- Verify it opens standalone and works with basic offline support (after first visit)

### 9. Custom domain (optional)

- **Domain management → Add custom domain** in Netlify dashboard
- Follow DNS instructions

---

## Notes

- **Env var changes** on Netlify require redeployment: **Deploys → Trigger deploy**
- The **report threshold** lives in two places — update **both** if you change it:
  - `app.settings` in the Supabase database (authoritative)
  - `src/config/app-config.json` in the codebase (UI display)
