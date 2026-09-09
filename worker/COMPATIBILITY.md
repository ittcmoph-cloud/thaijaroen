# Compatibility gate

Phase 1 is intentionally read-only with respect to the production frontend.

Before changing `index.html` or merging this branch, capture responses from the existing Apps Script endpoint for the same requests and compare them with Worker responses after importing the same source data into D1.

Required parity checks:

- identical legacy array shape and ordering;
- every cell represented as a string;
- identical ITA legacy column order and existing URL values;
- News views at index 5 and Announcements views at index 4;
- complaints as eight columns, with empty note for newly submitted complaints;
- visitor count increments without application-level read-modify-write;
- Admin password is POST-only and never appears in a URL.

Do not move, rename, modify, or re-link existing MOIT/PDF files in GitHub.
