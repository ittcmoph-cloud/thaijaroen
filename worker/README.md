# Thaijaroen Cloudflare Worker API

Replacement backend for the legacy Google Apps Script API. `main/index.html` is intentionally unchanged in this phase.

## Architecture

`index.html` -> Cloudflare Worker `/api` -> D1

ITA file binaries remain in GitHub; D1 stores ITA metadata and the Worker returns raw GitHub URLs.

## API compatibility

The response envelope remains:

```json
{"status":"success","data":...}
```

Legacy datasets return arrays so the existing frontend renderers can be migrated with minimal changes.

Supported actions:

- `getExecutiveData`
- `getNewsData`
- `getAnnouncementData`
- `getKnowledgeData`
- `getBannerData`
- `getITAData`
- `getDownloadsData`
- `getAboutData`
- `getSystemsData`
- `getComplaintReport`
- `getVisitorCount`
- `getPopupConfig`
- `incrementViewCount`
- `checkAdminLogin` (POST)
- `saveComplaint` (POST)

## Cloudflare setup

1. Create a D1 database named `thaijaroen`.
2. Put its ID in `worker/wrangler.jsonc` replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. Run the migration:

```bash
cd worker
npx wrangler d1 migrations apply thaijaroen --remote
```

4. Create the admin password SHA-256 secret:

```bash
npx wrangler secret put ADMIN_PASSWORD_SHA256
```

The Worker never stores or hard-codes the admin password. Optionally set `ADMIN_SHEET_URL` if the existing admin page still needs a compatibility link.

5. Optionally set `ALLOWED_ORIGIN` to the exact production frontend origin. Leave unset during initial testing to allow `*` CORS.

6. Deploy:

```bash
npx wrangler deploy
```

## Data migration

`legacy_rows` is the compatibility bridge. Each row is stored as JSON in `data_json`, and every cell should be stored as a string to emulate Apps Script `getDisplayValues()`.

Datasets:

`Executive`, `News`, `Announcements`, `Knowledge`, `Banners`, `Downloads`, `About`, `Systems`, `Popup`.

`Complaints` uses the structured `complaints` table. `ITA` uses `ita_documents` and GitHub paths.

The import process should preserve the original row order as `row_index` and omit the spreadsheet header row, matching the old `getSheetData()` behavior.

## Important

Do not put `Code.gs` or passwords in this repository. Do not modify `main/index.html` until the Worker and D1 have been populated and tested against the legacy API responses.
