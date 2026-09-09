CREATE TABLE IF NOT EXISTS legacy_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  UNIQUE(dataset, row_index)
);
CREATE INDEX IF NOT EXISTS idx_legacy_dataset ON legacy_rows(dataset);
CREATE INDEX IF NOT EXISTS idx_legacy_dataset_row ON legacy_rows(dataset, row_index);

CREATE TABLE IF NOT EXISTS legacy_views (
  dataset TEXT NOT NULL,
  legacy_row_id INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(dataset, legacy_row_id),
  FOREIGN KEY(legacy_row_id) REFERENCES legacy_rows(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_legacy_views_dataset ON legacy_views(dataset);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT NOT NULL,
  type TEXT,
  topic TEXT,
  detail TEXT,
  name TEXT,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'รับเรื่องแล้ว',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_complaints_submitted ON complaints(submitted_at);

-- Reserved for the future 12-month ITA upload workflow.
-- Phase 1 getITAData does NOT depend on this table.
CREATE TABLE IF NOT EXISTS ita_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  moit TEXT NOT NULL,
  item_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  github_path TEXT NOT NULL,
  file_type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ita_moit ON ita_documents(moit, sort_order);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT OR IGNORE INTO settings(key, value, updated_at)
VALUES ('visitor_count', '0', datetime('now'));
