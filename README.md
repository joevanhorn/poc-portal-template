# POC Portal Template

GitHub template for an **Okta-authenticated, Vercel-hosted SPA that serves a single-page HTML implementation guide** for customer POCs.

```
HTML guide ──►  Next.js 16 SPA  ──►  next-auth (Okta OIDC)  ──►  Vercel
```

Pairs with the [`modules/poc-portal`](https://github.com/joevanhorn/ofcto-workforce-taskvantage/tree/main/modules/poc-portal) Terraform module, which provisions the Okta side (OIDC web app + dashboard bookmark with logo).

## Use this template

```bash
gh repo create joevanhorn/<customer>-poc-portal --template joevanhorn/poc-portal-template --public --clone
cd <customer>-poc-portal
```

Then:

1. **Replace `content/guide.html`** with your customer-facing implementation HTML.
2. **Push to GitHub.**
3. **Link to Vercel:** `vercel link --yes --project <customer>-poc-portal`
4. **Set env vars** in Vercel (see below).
5. **Apply the Terraform module** in your env's GitOps repo to create the Okta OIDC app + bookmark.

See [`modules/poc-portal`](https://github.com/joevanhorn/ofcto-workforce-taskvantage/tree/main/modules/poc-portal) for the Okta side and the `/deploy-poc-portal` Claude skill for an end-to-end automation.

## Stack

- Next.js 16 (App Router, Server Components)
- next-auth v4 with the Okta provider
- Tailwind CSS v4
- Mermaid v10 (loaded via CDN — any `<div class="mermaid">…</div>` in your guide renders automatically)

## Environment variables

Set in Vercel for each target (Production / Preview / Development). All `NEXT_PUBLIC_*` values are inlined at build time.

| Variable | Required | Source |
|---|---|---|
| `NEXTAUTH_URL` | yes | Production URL (e.g. `https://<customer>-poc-portal.vercel.app`) |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32` |
| `OKTA_ISSUER` | yes | `terraform output -raw issuer` from `modules/poc-portal` |
| `OKTA_CLIENT_ID` | yes | `terraform output -raw client_id` |
| `OKTA_CLIENT_SECRET` | yes | `terraform output -raw client_secret` (sensitive) |
| `NEXT_PUBLIC_BRAND_FULL_TITLE` | optional | Long header title |
| `NEXT_PUBLIC_BRAND_LOGIN_TITLE` | optional | Login page title |
| `NEXT_PUBLIC_BRAND_LOGIN_SUBTITLE` | optional | Login page subtitle |
| `NEXT_PUBLIC_BRAND_LOGIN_HINT` | optional | Login page footer hint |
| `NEXT_PUBLIC_BRAND_METADATA_TITLE` | optional | Browser `<title>` |
| `NEXT_PUBLIC_BRAND_METADATA_DESCRIPTION` | optional | Browser `<meta description>` |

## Local development

```bash
cp .env.example .env.local
# populate OKTA_ISSUER / OKTA_CLIENT_ID / OKTA_CLIENT_SECRET / NEXTAUTH_SECRET
npm install
npm run dev
# open http://localhost:3000
```

`http://localhost:3000/api/auth/callback/okta` is registered as a redirect URI by the Terraform module by default.

## How the guide renders

`content/guide.html` is read server-side by `lib/guide.ts`. Two extractions:

1. All `<style>…</style>` blocks → injected into the page via a `<style dangerouslySetInnerHTML>` tag so the guide keeps its bespoke styling.
2. The inner `<body>…</body>` content → injected via `dangerouslySetInnerHTML`. Inline `<script>` tags are stripped (Mermaid loads via `next/script` in `app/layout.tsx`).

`next.config.ts` has `outputFileTracingIncludes: { "/": ["./content/**/*"] }` so Vercel bundles the HTML into the serverless function.

## Caveats

- **No CSS sandboxing**: the guide's `<style>` blocks inject into the page's global stylesheet. If your guide uses common class names (`.btn`, `.callout`), they may collide with the host shell. The reference guides use specific class names (`.guide-content h1`, `.doc-header`) to avoid this.
- **Vercel SSO Protection** is on by default for new projects and breaks the Okta auth flow on `*.vercel.app` URLs. Either disable it (`PATCH /v9/projects/{id}` with `{"ssoProtection": null}`) or add a custom domain.
- **Env var trailing newlines**: the Vercel CLI's `vercel env add` for `production`/`preview` targets in CLI 53.x has quirks. The `/deploy-poc-portal` skill works around this by hitting the REST API directly with explicit JSON.
