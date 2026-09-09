PRAGMA foreign_keys = ON;

-- Compatibility storage: preserves Apps Script getDisplayValues() row shape.
CREATE TABLE IF NOT EXISTS legacy_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dataset TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  title_text TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE(dataset, row_index)
);

CREATE INDEX IF NOT EXISTS idx_legacy_rows_dataset_row
  ON legacy_rows(dataset, row_index);

CREATE INDEX IF NOT EXISTS idx_legacy_rows_dataset_title
  ON legacy_rows(dataset, title_text);

-- Atomic counters are kept outside JSON to avoid read-modify-write races.
CREATE TABLE IF NOT EXISTS view_counters (
  dataset TEXT NOT NULL,
  row_index INTEGER NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(dataset, row_index)
);

-- Complaint data is structured. Public legacy response blanks sensitive fields.
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submitted_at TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'รับเรื่องแล้ว',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_complaints_created
  ON complaints(created_at DESC);

-- Generic settings/counters.
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_integer INTEGER,
  value_text TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings(key, value_integer)
VALUES ('visitor_count', 0);

-- Prepared for Phase 2: ITA 12-month upload metadata.
-- Phase 1 getITAData still reads legacy_rows to preserve the current frontend.
CREATE TABLE IF NOT EXISTS ita_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year TEXT NOT NULL DEFAULT '2569',
  round_name TEXT NOT NULL DEFAULT '12months',
  category TEXT NOT NULL DEFAULT '',
  moit TEXT NOT NULL,
  item_code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  github_path TEXT NOT NULL,
  public_url TEXT NOT NULL DEFAULT '',
  file_type TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  approved_for_publish INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ita_documents_public
  ON ita_documents(fiscal_year, round_name, moit, sort_order, active);
