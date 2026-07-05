# 🩷 Link X Link 🩷

> **Connect with real people. Swipe, discover, and send a WhatsApp instantly.**

[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-✔️-success)](#)
[![react-router](https://img.shields.io/badge/react--router-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com)
[![i18next](https://img.shields.io/badge/i18next-26A69A?logo=i18next&logoColor=white)](https://www.i18next.com)

---

## ✨ What is Link x Link?

A **PWA** built for users. Browse people profiles with photos, name, and description, and connect with them directly via **WhatsApp** in one click. Tinder-like horizontal card navigation, community reporting system, and profiles that auto-disable after a report threshold.

---

## 🚀 Features

| | |
|---|---|
| 🃏 **Profile cards** | Photos, name, age, interests — branded fallback image when there are no photos |
| 👆 **Tinder-style swipes** | Real drag gestures, card stack, fly-out animation, undo |
| 📲 **Direct WhatsApp** | One-tap to `wa.me/<number>` |
| 🔑 **User accounts** | Supabase Auth: Google / Facebook / Apple (configurable) + email |
| 📝 **Self-registration** | 3-step wizard (account → share gate → profile): gender, interests, 18+ birthdate, pro phone validation with country flag, client-side photo optimization |
| 👤 **My account** | Read-only summary + edit (name/bio/gender/interests), hide or pause your profile until a date |
| 💬 **Community** | Telegram channel for support, bug reports & feature requests (`telegram_url`) — on /account and landing |
| 👀 **Anonymous preview** | Signed-out visitors get a teaser of N profiles (numbers hidden) before the gate |
| 🛂 **Roles** | Admins (global stats + manage moderators) and moderators (approve/skip deck + own stats); admin can switch views |
| 🚨 **Community reports** | Profile disables after `report_threshold` reports (DB trigger); full moderation audit trail |
| 📊 **Metrics** | Anonymous per-device views & WhatsApp clicks (`profile_events`) |
| 🔀 **Rotation** | Per-device least-seen-first ordering — not everyone sees the same people first |
| 🌐 **i18n** | Spanish (default) and English |
| 📱 **Installable PWA** | Offline support: cached profiles + photos, auto-updating service worker |
| 🔐 **Server-side gate** | Feed access enforced by RLS (not just a popup); hidden admin path (`VITE_ADMIN_PATH`) |
| ⚙️ **Parametrizable** | Limits, gates, preview, tracking, interests, deck behavior — all in `src/config/app-config.json` |

---

## 🗺️ Routes

| Route | Purpose |
|---|---|
| `/` | Landing page (`/es`, `/en` for language-specific) |
| `/app` | Swipe feed (soft-gated: account + profile required, via popup) |
| `/register` | Self-registration wizard |
| `/account` | Manage own profile (edit, hide/pause) |
| `/admin` | Staff panel (role-based views) — path configurable via `VITE_ADMIN_PATH` |
| `/eula` | Terms and conditions |
| `/privacy` | Privacy policy |
| `/data` | Data usage |

---

## 📚 Docs

| File | Contents |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Architecture and design decisions |
| [`CLAUDE.md`](./CLAUDE.md) | Project conventions |
| [`SETUP.md`](./SETUP.md) | Full Supabase + Vercel setup guide |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute |
| [`SECURITY.md`](./SECURITY.md) | Vulnerability reporting |

---

## 🤝 Contributing

Contributions welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development guide and pull request process.

> **Important:** The `main` branch is strictly reserved for stable releases. All Pull Requests MUST be made against the `beta` branch. No PRs will be approved if they target `main` directly.

---

## 📄 License

Apache 2.0 — See [LICENSE](./LICENSE).
