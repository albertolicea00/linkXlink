# Link x Link

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
| 🃏 **Profile cards** | 1–3 photos, name, description |
| 📲 **Direct WhatsApp** | One-tap to `wa.me/<number>` |
| 👆 **Swipe navigation** | Fluid horizontal card browsing |
| 🚨 **Community reports** | Profile disables after `report_threshold` reports (DB trigger) |
| ⚠️ **Swap limit** | Client-side counter (rolling 24h) with WhatsApp ban warning |
| 🌐 **i18n** | Spanish (default) and English |
| 📱 **Installable PWA** | Basic offline support |
| 🔐 **Admin panel** | `/admin` to create and reactivate profiles (Supabase Auth) |

---

## 🗺️ Routes

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/app` | Profile feed |
| `/admin` | Admin panel |
| `/eula` | Terms and conditions |
| `/privacy` | Privacy policy |

---

## 📚 Docs

| File | Contents |
|---|---|
| [`DESIGN.md`](./DESIGN.md) | Architecture and design decisions |
| [`CLAUDE.md`](./CLAUDE.md) | Project conventions |
| [`SETUP.md`](./SETUP.md) | Full Supabase + Netlify setup guide |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | How to contribute |
| [`SECURITY.md`](./SECURITY.md) | Vulnerability reporting |

---

## 🤝 Contributing

Contributions welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for development guide and pull request process.

---

## 📄 License

Apache 2.0 — See [LICENSE](./LICENSE).
