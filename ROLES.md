# Roles

Four roles, all sharing the same Supabase Auth. Role is decided purely by table
membership — no row in `admins`/`moderators` = regular user, row in
`moderators` = moderator, row in `admins` = admin. Admin **is** a moderator
(`is_moderator()` returns true for admins too); a moderator is **not** an admin.

## Quick matrix

| Capability | Visitor (signed out) | User (no profile) | User (has profile) | Moderator | Admin |
|---|---|---|---|---|---|
| Browse landing page | ✅ | ✅ | ✅ | ✅ | ✅ |
| See preview profiles (teaser, WhatsApp hidden) | ✅ if `preview_profiles_count > 0` | ✅ | — | — | — |
| Sign up / log in | ✅ | — | — | — | — |
| See the full feed, swipe deck | ❌ | ❌ | ✅ | ✅ | ✅ |
| Contact via WhatsApp | ❌ | ❌ | ✅ | ✅ | ✅ |
| Report a profile | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create own profile (`/register`) | ❌ | ✅ | already has one (max 1) | ✅ | ✅ |
| Claim a migrated (seed) profile by phone | ❌ | ✅ | — | — | — |
| File an ownership claim ("es mío") on an owned number | ❌ | ✅ | — | — | — |
| Edit own profile (`/account`) | ❌ | — | ✅ | ✅ | ✅ |
| Replace own photo | ❌ | — | ✅ | ✅ | ✅ |
| Change / reset password | ✅ (reset email only) | ✅ | ✅ | ✅ | ✅ |
| Open `/admin` panel | ❌ (login prompt) | ❌ (not authorized) | ❌ (not authorized) | ✅ moderator view | ✅ both views |
| See moderation deck, approve/deny/skip pending profiles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve/deny bypasses quorum | ❌ | ❌ | ❌ | ❌ (needs quorum) | ✅ always |
| See own approved/denied/pending/skipped-today stats | ❌ | ❌ | ❌ | ✅ | ✅ (moderator view) |
| See global stats (totals, fake/migrated/no-profile counts) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Search users by email | ❌ | ❌ | ❌ | ❌ | ✅ |
| Promote user → moderator | ❌ | ❌ | ❌ | ❌ | ✅ |
| Promote user → admin | ❌ | ❌ | ❌ | ❌ | ✅ |
| Remove a moderator | ❌ | ❌ | ❌ | ❌ | ✅ |
| Remove an admin (not self) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Remove **self** as admin | — | — | — | — | ❌ (blocked, self-lockout guard) |
| Toggle dev flags (`</>` button) | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## Visitor (signed out)

- Lands on `/`. Can read the landing page, EULA, privacy policy, data-usage page.
- `/app` shows a teaser of `preview_profiles_count` active profiles via the
  `preview_profiles` RPC (WhatsApp hidden, report disabled) if that count is
  `> 0`; otherwise a hard "join to see profiles" gate immediately
  (`AuthGateModal`, mode `auth`).
- Can sign up (email or an enabled OAuth provider) or log in. Can request a
  password reset email (`/reset-password`) without being signed in.
- Cannot read the real feed at all — enforced server-side by RLS
  (`has_own_profile()` + `active = true`), not just the UI popup.

## User — no profile yet

- Has a Supabase Auth account but no row in `profiles` with `owner_id` set to
  them.
- `/app` shows the "Te falta tu perfil" gate (`AuthGateModal`, mode `profile`)
  instead of the feed.
- Can go through `/register`: share the app N times, then fill the profile
  form. The new row always inserts `active = false` (pending) — enforced by
  RLS, not the client — **unless** the WhatsApp number matches an unclaimed
  migrated (seed) profile, in which case `claim_migrated_profile` assigns that
  row to them and it stays active (no re-review).
- If the number is already owned by someone else's real profile, they can file
  an ownership claim ("Es mío") for a moderator to review — no automatic
  reassignment.
- One profile per account (unique index on `owner_id`), one profile per
  WhatsApp number (unique index on `whatsapp`).

## User — has a profile

- Everything above, plus: once `active = true` (approved), sees and swipes the
  real feed, opens WhatsApp, reports other profiles.
- `/account`: read-only summary by default; "Edit profile" reveals the
  editable form. Can change name, description, gender, interested-in,
  interests, region, visibility (hide / hide-until-date), and replace their
  photo — all through the `update_own_profile` RPC, which only ever touches
  the caller's own row and a whitelisted column set. Cannot touch
  `active`, `report_count`, `owner_id`, `whatsapp`, or `birthdate` — cannot
  self-approve or spoof ownership.
- Photo replacement is direct (no re-moderation) — a deliberate simplicity
  trade-off, revisit if it's abused.
- Can change their password from `/account` or request a reset email while
  logged out.
- Getting reported `report_threshold` times auto-disables the profile via a DB
  trigger — no moderator action needed.

## Moderator

- Everything a regular user can do, plus access to `/admin` in the moderator
  view (the only view a moderator can reach — no `?view=admin` toggle for
  them).
- Sees their own stats: approved by me, denied by me, pending count, and
  skipped today (skipped-today is a local per-device counter, not a DB value —
  it resets at local midnight and isn't shared across devices).
- Moderation deck: any drag/arrow swipe is always a **skip**. Approve and deny
  are explicit buttons only.
  - **Approve** applies once `moderation_approve_quorum` distinct moderators
    have voted (default 1 — so a single moderator approving still works
    instantly unless the config is raised).
  - **Deny** requires a reason from a fixed pick-list and applies once
    `moderation_deny_quorum` distinct moderators have voted (default 3).
  - Denying an **unclaimed migrated (seed)** profile deletes the row outright
    instead of soft-denying it — a seed row has no real person behind it, and
    a permanent denied stub would squat the WhatsApp number forever.
- Cannot see global admin stats, cannot search/promote/remove staff, cannot
  switch to the admin view.

## Admin

- Everything a moderator can do (`is_moderator()` is true for admins too),
  plus:
  - Can switch between the admin view and the moderator view from the nav bar.
  - Admin view shows global stats: total/active/pending/banned profiles, and
    database-wide counters (fake profiles, migrated total/unclaimed, accounts
    with no profile at all) — these counters are **never** affected by dev
    flags or the panel's own filtered profiles query; they're always the true
    totals.
  - A single admin vote **always** applies an approve or deny immediately,
    bypassing the moderator quorum entirely.
  - Can search any user account by email and promote them to moderator or
    admin — each promotion requires a confirmation dialog.
  - Can remove a moderator or another admin — each removal requires a
    confirmation dialog. Cannot remove themselves from the admins list (guard
    against accidental self-lockout).
  - Sees a floating `</>` button (bottom-right, semi-transparent) opening a
    dev-flags panel: show only fake profiles, bypass the release-date gate,
    show only unclaimed migrated profiles, bypass the daily swap/click limit.
    These are per-device localStorage toggles for QA — **not** a security
    boundary, and never affect the global stats counters.

## Notes

- The first admin has to be created by hand (Supabase Auth user + a row in
  `admins`, via SQL) — see `SETUP.md`. Every admin after that can be promoted
  from the panel, no SQL needed.
- `VITE_ADMIN_PATH` only hides the `/admin` URL from casual visitors — it ships
  inside the JS bundle. The actual boundary is the staff login + RLS, not the
  path.
- All of the above server-side rules live in `supabase/migrations/` — the
  client-side checks (popups, disabled buttons) are UX, not the real gate.
