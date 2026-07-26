# Contributing to Link x Link 🙌

Thanks for your interest in improving Link x Link!

## 🧭 Conventions

- **Code language**: everything in English (code, identifiers, comments, commits)
- **UI texts**: never hardcoded — always through i18n (`src/i18n/`)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/), short subject, no co-author or AI attribution
- **System parameters**: in `src/config/`, not magic numbers — split by what the value is:
  - `app-config.json` — behavior knobs (limits, gates, deck, moderation, options)
  - `app-links.json` — outward-facing URLs and project identity
  - `dev-config.json` — admin/dev-only toggles and `dev_flags`

## 🎭 Demo Mode

The project includes a built-in mock system (`src/lib/mockFetch.ts` and `src/mocks/`) that intercepts API calls to simulate users and data without a real backend. **Keep this system minimal.** Only add the strictly necessary logic and data required to demonstrate the app's functionality. Avoid overly complex mock state or exhaustive data sets that add unnecessary maintenance overhead.

## ⛔ Protected configuration

`src/config/app-config.json` and `src/config/app-links.json` drive live behavior and the project's public identity. **Do not touch them** unless the change is the actual point of your contribution, and say why in the PR description. "Tidied up the config", reordering keys, reformatting, or flipping a limit "because it seemed better" are not reasons — a PR that edits these files without a clear, coherent justification gets closed without review.

Three keys in `app-links.json` are **strictly off limits**:

| Key | Why |
|---|---|
| `author_handle` | Attribution of authorship |
| `author_website_url` | Attribution of authorship |
| `support_coffee_url` | Donations from the app's users |

Changing `author_handle` or `author_website_url` strips the author's credit. To be precise about the license: Apache 2.0 does not require a credit line in the UI, but §4(a)–(c) does require you to keep the copyright notices and any `NOTICE` file when you redistribute. Swapping the credit **and** shipping the result as your own work is plagiarism — presenting someone else's project as yours — and if you also drop the notices from the source, it is a straight license violation. See [`LICENSE`](./LICENSE).

Changing `support_coffee_url` points the "buy me a coffee" button at **your** account, so money users intend for this project's author lands in someone else's pocket. The license has nothing to say about that — it is worse. Collecting donations under someone else's name and project is deception of the donor and can be treated as fraud, entirely independently of any copyright question.

This applies to forks too. A fork is welcome — the license allows it — but if you publish or deploy it:

1. Keep the author credit intact, or make the fork's own authorship unambiguous while still attributing the original as the license requires.
2. **Remove** the donation CTA (set `support_coffee_url` to `""`, which hides the card) or replace it with your own **only after** the fork is clearly presented as a different project, not as this one.

If you are unsure whether your change crosses that line, ask first in the [Telegram channel](https://t.me/linksxlinks) — before writing code, not after.

## 🛠️ Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run dev
```

Available commands:

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build (includes typecheck) |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint with oxlint |

## 🔀 Pull Requests

1. **Target Branch:** All Pull Requests MUST be opened against the `beta` branch. The `main` branch is strictly reserved for stable releases.
2. Create a descriptive branch name (`feat/`, `fix/`, `refactor/`)
3. Make sure `npm run build` passes without errors
4. Follow project conventions
5. If adding UI strings, include **es** and **en** translations
6. Use the PR template when opening

## 🐛 Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Expected vs actual behavior
- Steps to reproduce
- Screenshots if applicable

## 💡 Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## 🔒 Security

Found a vulnerability? Check [`SECURITY.md`](./SECURITY.md).
