# Setup Guide 🛠️

Step-by-step to get Link x Link running — from Supabase to production on Vercel.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [A. Supabase (backend)](#a-supabase-backend)
- [B. Vercel (deploy)](#b-vercel-deploy)

---

## Prerequisites

- Node.js >= 20
- A [GitHub](https://github.com) account
- A [Supabase](https://supabase.com) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- This repo cloned locally:
  ```bash
  git clone https://github.com/albertolicea00/linkxlink
  cd linkxlink
  ```

---

## A. Supabase (backend)

### 1. Create a project

- Go to <https://supabase.com>
- **Start a project** → pick the closest region, set a strong DB password, free tier is fine.
- Wait for the database to provision (~1–2 min).

### 2. Run the migrations (in order)

- Dashboard → **SQL Editor**
- Paste and **Run** each file from `supabase/migrations/`, in numeric order:

| File | What it creates |
|---|---|
| `0001_init.sql` | `profiles`, `reports`, `admins`, `profile-photos` bucket, RLS, auto-disable trigger |
| `0002_self_registration.sql` | Public self-registration (pending profiles), unique WhatsApp index, bucket size/mime limits |
| `0003_metrics.sql` | `profile_events` (views / WhatsApp clicks) + `moderation_actions` (audit trail) |
| `0004_user_auth.sql` | `profiles.owner_id` (one profile per account), registration requires a signed-in user |
| `0005_moderators.sql` | `moderators` table + `is_moderator()`; moderation policies extended to moderators |

### 3. Verify the schema

- **Table Editor** → confirm `profiles`, `reports`, `admins`, `moderators`, `profile_events`, `moderation_actions` exist
- **Storage** → confirm `profile-photos` bucket (should be public)

### 4. Create staff (admins and moderators)

Both are hand-created: a Supabase Auth user + a row in the corresponding table.

- **Authentication → Users → Add user** (email + password, enable auto-confirm)
- Copy the generated **UUID**
- **SQL Editor** → run one of:
  ```sql
  -- Full admin (manages moderators, reads metrics, everything):
  insert into public.admins (id, email)
  values ('<copied-uuid>', '<email>');

  -- Moderator (only approves/skips pending profiles):
  insert into public.moderators (id, email)
  values ('<copied-uuid>', '<email>');
  ```

> An account with no row in either table gets "not authorized" on the admin panel, even with a valid login — regular app users share the same Supabase Auth.

### 5. Enable auth providers (end users)

End users sign up with OAuth and/or email — buttons shown come from `auth_providers` in `src/config/app-config.json`.

- **Authentication → Providers**:
  - **Email** works out of the box. Decide on **Confirm email** (Auth → Settings): if ON, users must confirm before the session starts (the UI tells them to check their inbox).
  - **Google** — needs an OAuth client in Google Cloud Console.
  - **Facebook** — needs an app in Meta for Developers.
  - **Apple** — needs a (paid) Apple Developer account. Skip it by removing `"apple"` from `auth_providers`.
- **Authentication → URL Configuration**: add `http://localhost:5173` and your production domain to **Redirect URLs** (OAuth returns the user to the page they started on).

> Deploying before OAuth credentials are ready? Set `"auth_providers": []` — email login still works.

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
# Optional: secret path for the admin panel (defaults to /admin)
VITE_ADMIN_PATH=/my-secret-admin
```

> The anon key is **public by design** — security comes from RLS, not key secrecy.
> `VITE_ADMIN_PATH` only hides the admin URL from casual visitors — it ships inside the JS bundle. Real protection is the staff login + RLS.

### 8. Test locally

```bash
npm install     # if you haven't yet
npm run dev
```

Walk through:

- [ ] Open `/app` → auth gate popup appears → create a user account (email or OAuth)
- [ ] Profile gate appears → "Create my profile" → wizard: share 3 times → fill the profile form → submitted as pending
- [ ] Login at the admin path with a moderator/admin → the pending profile shows in the moderation deck → swipe right / **Approve**
- [ ] The profile now appears in the feed at `/app`
- [ ] Report it 3 times (from 3 different browsers/incognito sessions — same browser blocks duplicates) → profile must disappear from feed

---

## B. Vercel (deploy)

### 1. Push to GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import project

- Go to <https://vercel.com>
- **Add New → Project**
- Import your GitHub repository

### 3. Build settings

Vercel auto-detects Vite. Verify the defaults:

| Setting | Value |
|---|---|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |

### 4. Environment variables

**Before deploying**, expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `VITE_ADMIN_PATH` | (optional) Secret admin panel path, e.g. `/my-secret-admin` |

> After deploying, add the production URL to Supabase **Authentication → URL Configuration → Redirect URLs**, or OAuth logins will bounce.

### 5. Deploy

- Click **Deploy**
- Wait for the green build ✅

### 6. SPA fallback

After deploy, go to your project **Settings → Git** and add a `vercel.json` at repo root for SPA routing:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Or add it now in the repo before pushing — Vercel will pick it up automatically.

### 7. Verify on `*.vercel.app`

- [ ] `/app` loads profiles from Supabase
- [ ] Direct routes work (e.g. open `/eula` directly — SPA rewrite must work)
- [ ] WhatsApp button opens `wa.me/<number>`

### 8. PWA on mobile

- Open the Vercel URL in Android/Chrome
- **Add to Home Screen**
- Verify it opens standalone and works with basic offline support (after first visit)

### 9. Custom domain (optional)

- Go to **Project → Settings → Domains** in Vercel dashboard
- Add your domain and follow DNS instructions

---

## Notes

- **Env var changes** on Vercel require redeployment: **Deployments → Redeploy**
- The **report threshold** lives in two places — update **both** if you change it:
  - `app.settings` in the Supabase database (authoritative)
  - `src/config/app-config.json` in the codebase (UI display)


- **Roles recap**: `admins` = everything (incl. managing moderators and reading metrics). `moderators` = only approve/skip pending profiles. Regular users = swipe and own one profile. All three share the same Supabase Auth; the tables decide the role.

