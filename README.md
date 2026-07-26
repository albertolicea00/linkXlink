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

## ⚠️ Production Warning & Known Risks

This project is currently provided as a **proof-of-concept / example application**. Deploying this code as-is to a production environment is a **security risk** because it lacks several critical systems to prevent spam, abuse, and impersonation.

The following minimum required features are currently missing and marked as `wontfix` due to lack of funding *(please support the project hehehe and maybe we will build them!)*:

- [Automated AI Image Moderation (#22)](https://github.com/albertolicea00/linkXlink/issues/22)
- [Server-Side Rate Limiting and Anti-Scraping Protection (#25)](https://github.com/albertolicea00/linkXlink/issues/25)
- [Automated Text Moderation for Bios (#27)](https://github.com/albertolicea00/linkXlink/issues/27)
- [Robust Age and Identity Verification (#29)](https://github.com/albertolicea00/linkXlink/issues/29)
- [SMS/WhatsApp OTP Phone Number Verification (#13)](https://github.com/albertolicea00/linkXlink/issues/13)

---

## ✨ What is Link x Link?

A **PWA** built for users. Browse people profiles with photos, name, and description, and connect with them directly via **WhatsApp** in one click. Tinder-like horizontal card navigation, community reporting system, and profiles that auto-disable after a report threshold.

---

## 🚀 Features

|                            |                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🃏 **Profile cards**       | Photos, name, age, interests — branded fallback image when there are no photos                                                                           |
| 👆 **Tinder-style swipes** | Real drag gestures, card stack, fly-out animation, undo                                                                                                  |
| 📲 **Direct WhatsApp**     | One-tap to `wa.me/<number>`                                                                                                                              |
| 🔑 **User accounts**       | Supabase Auth: Google / Facebook / Apple (configurable) + email                                                                                          |
| 📝 **Self-registration**   | 3-step wizard (account → share gate → profile): gender, interests, 18+ birthdate, pro phone validation with country flag, client-side photo optimization |
| 👤 **My account**          | Read-only summary + edit (name/bio/gender/interests), hide or pause your profile until a date                                                            |
| 💬 **Community**           | Telegram channel for support, bug reports & feature requests (`community_telegram_url`) — on /account and landing                                        |
| 👀 **Anonymous preview**   | Signed-out visitors get a teaser of N profiles (numbers hidden) before the gate                                                                          |
| 🛂 **Roles**               | Admins (global stats + manage moderators + config viewer) and moderators (approve/skip deck + own stats); each on its own route                          |
| 🚨 **Community reports**   | Profile disables after `report_threshold` reports (DB trigger); full moderation audit trail                                                              |
| 📊 **Metrics**             | Anonymous per-device views & WhatsApp clicks (`profile_events`)                                                                                          |
| 🔀 **Rotation**            | Per-device least-seen-first ordering — not everyone sees the same people first                                                                           |
| 🌐 **i18n**                | Spanish (default) and English                                                                                                                            |
| 📱 **Installable PWA**     | Offline support: cached profiles + photos, auto-updating service worker; native install prompt on Chromium, guided manual walkthrough on iOS Safari                                                                                  |
| 🔐 **Server-side gate**    | Feed access enforced by RLS (not just a popup); staff routes gated by role tables + RLS                                                                    |
| ⚙️ **Parametrizable**      | Limits, gates, preview, tracking, interests, deck behavior in `src/config/app-config.json`; URLs & identity in `app-links.json`; admin/dev toggles in `dev-config.json`                                                       |

## 🎭 Demo Users

This project includes a built-in mock system designed to showcase the app's functionality `just make-believe` without needing a real Supabase backend connection. The mock system intercepts API requests and returns static JSON profiles located in `src/mocks/`.

You can log in with the following demo credentials to explore different roles:

- **Admin**: `admin@demo.com` (Password: any)
- **Moderator**: `moderator@demo.com` (Password: any)
- **User**: `user@demo.com` (Password: any)

While a demo account is signed in, a **Demo mode** banner stays on screen on every page: the profiles are fabricated, nothing is persisted, and some flows (photo upload, WhatsApp, registration) do nothing. Each account can be switched off individually with `demo_admin` / `demo_moderator` / `demo_user` in `src/config/dev-config.json`.

Demo WhatsApp numbers use the `1-555-555-01xx` range, reserved for fiction — tapping through can never reach a real person.

---

## 🗺️ Routes

| Route       | Purpose                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `/`         | Landing page (`/es`, `/en` for language-specific)                        |
| `/app`      | Swipe feed (soft-gated: account + profile required, via popup)           |
| `/register` | Self-registration wizard                                                 |
| `/account`  | Manage own profile (edit, hide/pause)                                    |
| `/admin`    | Admin dashboard — global stats + staff management                        |
| `/admin/moderator` | Moderation deck — pending queue, approve/deny                     |
| `/admin/config`    | Read-only viewer for the three config JSONs                       |
| `/eula`     | Terms and conditions                                                     |
| `/privacy`  | Privacy policy                                                           |
| `/data`     | Data usage                                                               |

---

## 📱 Installing the app (PWA)

Link x Link is an installable PWA, but **how** you install it depends on the browser — because the two platforms expose very different APIs:

| Platform / browser          | How install works                                                                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chrome / Edge / Android** | Fire a `beforeinstallprompt` event. The app captures it (`src/hooks/useInstallPrompt.ts`) and can show a custom **Install app** button that opens the native prompt. |
| **iOS / iPadOS Safari**     | **No install API exists.** Apple never fires `beforeinstallprompt` — installation is 100% manual and cannot be triggered from JavaScript. The app detects the case and shows a manual walkthrough (`src/hooks/useIOSInstallHint.ts` + `src/components/IOSInstallHint.tsx`). |

### Why the install button doesn't appear on iPhone/iPad

This is an **iOS platform limitation, not a bug**. Safari on iOS does not support the `beforeinstallprompt` event, so `useInstallPrompt` never receives it and `canInstall` stays `false`. There is no way for a website to programmatically prompt "Add to Home Screen" on iOS.

### Manual install on iOS (Safari only)

1. Open the site in **Safari** (not Chrome/Firefox on iOS — third-party browsers there can't add to the Home Screen either).
2. Tap the **Share** button (square with an up arrow).
3. Scroll down and tap **Add to Home Screen** / **Añadir a pantalla de inicio**.
4. Confirm — the app icon lands on the Home Screen and launches standalone (its own window, no Safari chrome).

### "Unsafe app blocked" / "built for an older version of Android" on install

Google Play Protect can block the install with **Unsafe app blocked — This app was built for an older version of Android and doesn't include the latest privacy protections**. It isn't — **nothing in this repo can cause or fix it**.

Why it happens: installing a PWA on Android doesn't create a shortcut, it creates a real APK. The browser asks Google's WebAPK minting server to generate an APK that wraps the site, and **the browser's minting pipeline decides that APK's `targetSdkVersion`** — the web manifest has no say. Since Android 14, Play Protect refuses APKs targeting an old SDK (API < 23; Android 15 raised the bar to < 24). A WebAPK minted with a stale target lands on the wrong side of that filter.

In practice it shows up on non-Chrome Chromium browsers (Samsung Internet, some vendor browsers) that lag behind on WebAPK minting. Workarounds, best first:

1. **Install from an up-to-date Chrome** — fixes the vast majority of reports.
2. Update the browser and Google Play services on the device.
3. Tap **Install anyway** (a tappable link above the blue button) — works, but no ordinary user will do it.
4. Use **Add to Home screen** in plain shortcut mode where the browser offers it: no APK, so Play Protect never sees it. Costs the standalone launch.

> To detect an installed session, check `window.matchMedia('(display-mode: standalone)').matches` (or `navigator.standalone` on iOS). The app **does** ship an iOS-specific nudge: `useIOSInstallHint` detects iOS Safari (not yet standalone) and `IOSInstallHint` renders these manual steps in an overlay — auto-shown once per device (`lxl_ios_hint_seen`) and reopenable from the NavBar **Install** button. Third-party iOS browsers (Chrome/Firefox), which can't add to the Home Screen at all, get an "open in Safari" message instead.

---

## 🎥 Promotional Assets & Videos

Marketing materials, video showcases, and feature promos are managed in an isolated repository — see the promo assets repo here: [linkxlink-promo-assets](https://github.com/albertolicea00/linkxlink-promo-assets). It mounts into a `videos/` folder within this project.

To easily set up the promotional assets locally (run this from the root of this repository):

```bash
curl -sL https://raw.githubusercontent.com/albertolicea00/linkXlink-promo-assets/main/setup.sh | bash
```
*(If you are new and haven't cloned this repo yet, you can clone both at once from anywhere by adding `--with-parent` to the script arguments).*

---

## 📚 Docs

| File                                   | Contents                           |
| -------------------------------------- | ---------------------------------- |
| [`DESIGN.md`](./DESIGN.md)             | Architecture and design decisions  |
| [`CLAUDE.md`](./CLAUDE.md)             | Project conventions                |
| [`SETUP.md`](./SETUP.md)               | Full Supabase + Vercel setup guide |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute                  |
| [`SECURITY.md`](./SECURITY.md)         | Vulnerability reporting            |

---

## 🤝 Contributing

Contributions welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development guide and pull request process.

> **Important:** The `main` branch is strictly reserved for stable releases. All Pull Requests MUST be made against the `beta` branch. No PRs will be approved if they target `main` directly.

---

## 📄 License

Apache 2.0 — See [LICENSE](./LICENSE).
