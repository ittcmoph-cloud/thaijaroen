# Thaijaroen Cloudflare Worker API

Replacement backend for the legacy Google Apps Script API. `main/index.html` is intentionally unchanged in this phase.

## Architecture

`index.html` -> Cloudflare Worker `/api` -> D1

ITA PDF/MOIT files already in GitHub are not moved, renamed, edited, or re-linked in this phase. `getITAData` reads the legacy `ITA` dataset from `legacy_rows` and returns its original array/column order and string values. The `ita_documents` table is reserved for the future 12-month upload workflow.

## API compatibility

Response envelope is `{"status":"success","data":...}` or `{"status":"error","message":"..."}`. Legacy datasets return arrays of strings.

Supported 15 actions: `getExecutiveData`, `getNewsData`, `getAnnouncementData`, `getKnowledgeData`, `getBannerData`, `getITAData`, `getDownloadsData`, `getAboutData`, `getSystemsData`, `getComplaintReport`, `getVisitorCount`, `getPopupConfig`, `incrementViewCount`, `checkAdminLogin`, `saveComplaint`.

`getComplaintReport` returns `[dateTime,type,topic,detail,name,contact,status,note]`. New complaints use `status = "รับเรื่องแล้ว"` and `note = ""`.

## D1 schema

- `legacy_rows`: compatibility bridge for Executive, News, Announcements, Knowledge, Banners, ITA, Downloads, About, Systems, Popup. `data_json` is an array of strings and `row_index` is zero-based after the header.
- `legacy_views`: atomic counters for News index 5 and Announcements index 4.
- `complaints`: structured 8-column response table.
- `ita_documents`: future 12-month upload metadata; not the Phase 1 getITAData source.
- `settings`: D1 visitor counter, incremented by one SQL statement.

## Cloudflare setup

1. Create D1 database `thaijaroen`.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc`.
3. Apply migration: `npx wrangler d1 migrations apply thaijaroen --remote`.
4. Configure `ADMIN_PASSWORD_SHA256` with `npx wrangler secret put ADMIN_PASSWORD_SHA256`.
5. Optional: `ALLOWED_ORIGIN` for an exact production origin and `ALLOWED_DEV_ORIGINS` for comma-separated development origins.
6. `ADMIN_SHEET_URL` is temporary compatibility only.

Production CORS is restricted to `https://ittcmoph-cloud.github.io`. Do not deploy production in this phase.

## Excel migration

Install `openpyxl` from `requirements.txt`, then run:

`python scripts/import_legacy_excel.py ../legacy.xlsx > legacy_import.sql`

The importer skips the header row, preserves row order and complete worksheet used-range cells, converts cells to strings, and seeds News/Announcements view counters. Excel display formatting is not guaranteed to match Google Sheets `getDisplayValues()` for every locale/date/number case, so compare the generated data with the original Apps Script response before cutover.

## Tests

`npm test`

The automated suite covers all required compatibility targets, including News, Announcements, ITA, Popup, view increments, visitor counter, complaint save/report, POST-only Admin login, and unknown actions.

## Cutover gate

Do not merge or deploy until D1 is populated, legacy Apps Script responses are captured, Worker responses are compared dataset-by-dataset, tests pass, and security review is complete. Only in a later phase should `index.html` have its API URL changed once.
