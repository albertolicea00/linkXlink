# Contributing to Link x Link 🙌

Thanks for your interest in improving Link x Link!

## 🧭 Conventions

- **Code language**: everything in English (code, identifiers, comments, commits)
- **UI texts**: never hardcoded — always through i18n (`src/i18n/`)
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/), short subject, no co-author or AI attribution
- **System parameters**: in `src/config/app-config.json`, not magic numbers

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

1. Create a descriptive branch name (`feat/`, `fix/`, `refactor/`)
2. Make sure `npm run build` passes without errors
3. Follow project conventions
4. If adding UI strings, include **es** and **en** translations
5. Use the PR template when opening

## 🐛 Reporting Bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Expected vs actual behavior
- Steps to reproduce
- Screenshots if applicable

## 💡 Suggesting Features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

## 🔒 Security

Found a vulnerability? Check [`SECURITY.md`](./SECURITY.md).
