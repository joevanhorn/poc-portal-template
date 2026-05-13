/**
 * POC Portal branding strings, sourced from NEXT_PUBLIC_BRAND_* env vars.
 *
 * Set these in Vercel (Production / Preview / Development) — the values
 * are inlined at build time, so they're available in both Server and
 * Client Components.
 *
 * Each value has a generic default so the portal still renders if a
 * customer-specific brand env var isn't set.
 */
export const branding = {
  /** Long header title — shown across the top of the guide page. */
  fullTitle:
    process.env.NEXT_PUBLIC_BRAND_FULL_TITLE ?? "POC Implementation Guide",

  /** Short title — shown on the login page above the Okta button. */
  loginTitle: process.env.NEXT_PUBLIC_BRAND_LOGIN_TITLE ?? "POC Portal",

  /** Login page subtitle, one line. */
  loginSubtitle:
    process.env.NEXT_PUBLIC_BRAND_LOGIN_SUBTITLE ??
    "Implementation Guide",

  /** Smallprint footer on the login page. */
  loginHint:
    process.env.NEXT_PUBLIC_BRAND_LOGIN_HINT ??
    "Requires an account in the POC Okta org",

  /** <title> tag for the browser. */
  metadataTitle:
    process.env.NEXT_PUBLIC_BRAND_METADATA_TITLE ?? "POC Portal",

  /** <meta description> tag for the browser. */
  metadataDescription:
    process.env.NEXT_PUBLIC_BRAND_METADATA_DESCRIPTION ??
    "POC implementation guide.",
} as const;
