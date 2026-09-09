# Security notes for compatibility phase

- `checkAdminLogin` accepts POST only; credentials are read from JSON body, never URL query parameters.
- No admin password is present in source code or D1 schema.
- `ADMIN_PASSWORD_SHA256` is a Cloudflare Worker secret for this temporary compatibility phase. This is not considered the final Admin authentication/session design.
- Production CORS is restricted to `https://ittcmoph-cloud.github.io`; development origins may be explicitly added with `ALLOWED_DEV_ORIGINS`.
- `incrementViewCount` uses a dedicated D1 counter table and a single SQL upsert increment to avoid application-level read-modify-write races.
- `getVisitorCount` increments the D1 settings counter in one SQL statement.
- ITA Phase 1 reads `legacy_rows`; `ita_documents` is only a future metadata/upload schema.
- Existing GitHub PDF/MOIT files are not moved, renamed, modified, or re-linked by this phase.
- Do not deploy or merge until response parity against the Apps Script API is verified.
