# 🔒 Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Link x Link, please report it privately.

**Do not** open a public issue. Instead, email the maintainer or open a [private advisory](https://github.com/tu-usuario/linkxlink/security/advisories/new).

We'll acknowledge receipt within 48 hours and work on a fix before disclosing publicly.

## Scope

- Authentication bypass
- Data exposure (RLS misconfiguration, API leaks)
- XSS, CSRF, SQL injection
- Insecure Supabase configuration

Out of scope: theoretical attacks, rate limiting on personal projects, dependencies with known CVEs already patched in the lockfile.
