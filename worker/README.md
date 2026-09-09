# Thaijaroen Cloudflare Worker API

Replacement backend for the legacy Google Apps Script API. `main/index.html` is intentionally unchanged in this phase.

## Architecture

`index.html` -> Cloudflare Worker `/api` -> D1

ITA PDF/MOIT files already in GitHub are **not moved, renamed, edited, or re-linked** in this phase. `getITAData` reads the legacy `ITA` dataset from `legacy_rows` and returns its original array/column order and string values. The `ita_documents` table is reserved for the future 12-month upload workflow.

## API compatibility

Response envelope:

```json
{"status":"success","data":...}
```

Errors:

```json
{"status":"error","message":"..."}
```

All legacy datasets return arrays of strings. Supported 15 actions:

- `getExecutiveData`
- `getNewsData`
- `getAnnouncementData`
- `getKnowledgeData`
- `getBannerData`
- `getITAData`
- `getDownloadsData`
- `getAboutData`
- `getSystemsData`
- `getComplaintReport` (8 columns)
- `getVisitorCount`
- `getPopupConfig`
- `incrementViewCount`
- `checkAdminLogin` (POST only)
- `saveComplaint` (POST only)

## D1 schema

### `legacy_rows`
Compatibility bridge for:

`Executive`, `News`, `Announcements`, `Knowledge`, `Banners`, `ITA`, `Downloads`, `About`, `Systems`, `Popup`.

Each row stores `data_json` as a JSON array of strings and preserves zero-based `row_index` corresponding to the first data row after the legacy header.

### `legacy_views`
Atomic counters for legacy News/Announcements views. `News` uses array index 5; `Announcements` uses array index 4. The original row JSON is not used for concurrent read-modify-write increments.

### `complaints`
Structured table. `getComplaintReport` returns:

`[dateTime,type,topic,detail,name,contact,status,note]`

New complaints always use `status = "รับเรื่องแล้ว"` and `note = ""`.

### `ita_documents`
Prepared metadata schema for the future 12-month ITA upload/commit workflow. It is deliberately **not** the Phase 1 source for `getITAData`.

### `settings`
Stores the D1 visitor counter. The counter increment is a single SQLite upsert/update statement to avoid application-level lost updates.

## Cloudflare setup

1. Create a D1 database named `thaijaroen`.
2. Put its ID in `worker/wrangler.jsonc` replacing `REPLACE_WITH_D1_DATABASE_ID`.
3. Apply the migration:

```bash
cd worker
npx wrangler d1 migrations apply thaijaroen --remote
```

4. Configure the admin password as a Worker secret. For this compatibility phase the secret is the SHA-256 digest of the password; the password itself is never stored in source or D1:

```bash
npx wrangler secret put ADMIN_PASSWORD_SHA256
```

This is **not** the final Admin authentication design. The later Admin phase should use proper authentication/session management rather than password-hash comparison as the complete security model.

5. Optional environment variables:

- `ALLOWED_ORIGIN`: exact production origin if different from the built-in GitHub Pages origin.
- `ALLOWED_DEV_ORIGINS`: comma-separated development origins, for example `http://localhost:8787,http://127.0.0.1:8787`.
- `ADMIN_SHEET_URL`: temporary compatibility value only; not required by the Worker API itself.

Production CORS is restricted to:

`https://ittcmoph-cloud.github.io`

6. Deploy only after review:

```bash
npx wrangler deploy
```

**Do not deploy production as part of this migration phase.**

## Excel migration/import

Use `scripts/import_legacy_excel.py` with the original Excel workbook:

```bash
cd worker
python -m pip install -r requirements.txt
python scripts/import_legacy_excel.py ../legacy.xlsx > legacy_import.sql
```

The importer:

- skips the Excel header row (matching `getSheetData()` row 2 start);
- preserves row order as zero-based `row_index`;
- keeps blank/trailing cells in the worksheet used range;
- converts cells to strings;
- seeds `legacy_views` from News index 5 / Announcements index 4;
- never touches existing GitHub PDF/MOIT files.

Excel display formatting is not guaranteed to be byte-for-byte identical to Google Sheets `getDisplayValues()` for locale/date/number formats. Before cutover, compare an exported legacy response against Worker output and correct the source export/import where necessary.

## Tests

Run:

```bash
cd worker
npm test
```

Automated cases cover all required compatibility targets: News, Announcements, ITA, Popup, view increments, visitor counter, complaint save/report, POST-only admin login, and unknown actions, plus the remaining legacy datasets.

## Cutover gate

This branch must remain unmerged and undeployed until:

1. D1 is populated from the original data.
2. Legacy Apps Script responses are captured.
3. Worker responses are compared dataset-by-dataset.
4. All tests pass.
5. Security review is completed.
6. Only then should `index.html` have its API URL changed once in a later phase.
