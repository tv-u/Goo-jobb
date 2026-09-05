PRAGMA foreign_keys=ON;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  company_slug TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  country_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  remote_type TEXT NOT NULL DEFAULT 'unknown',
  employment_type TEXT NOT NULL DEFAULT 'unknown',
  category TEXT NOT NULL DEFAULT 'other',
  seniority TEXT NOT NULL DEFAULT 'unknown',
  salary_min REAL,
  salary_max REAL,
  salary_currency TEXT,
  salary_period TEXT,
  skills_json TEXT NOT NULL DEFAULT '[]',
  apply_url TEXT NOT NULL,
  source_url TEXT,
  posted_at TEXT,
  expires_at TEXT,
  content_hash TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_jobs_active_posted ON jobs(is_active, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_country ON jobs(country_code, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source_id, is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_hash ON jobs(content_hash);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  jobs_seen INTEGER NOT NULL DEFAULT 0,
  jobs_added INTEGER NOT NULL DEFAULT 0,
  jobs_updated INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'never'
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  path TEXT,
  job_id INTEGER,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

CREATE TABLE IF NOT EXISTS saves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anon_id, job_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id TEXT NOT NULL,
  email TEXT,
  query TEXT,
  filters_json TEXT NOT NULL DEFAULT '{}',
  frequency TEXT NOT NULL DEFAULT 'daily',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id TEXT NOT NULL,
  job_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'saved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(anon_id, job_id)
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL,
  seen INTEGER NOT NULL DEFAULT 0,
  added INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

-- D1/SQLite FTS5 virtual table. The sync layer keeps this index in step with jobs.
CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
  title, description, company, location, category, skills,
  content='jobs', content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS jobs_ai AFTER INSERT ON jobs BEGIN
  INSERT INTO jobs_fts(rowid,title,description,company,location,category,skills)
  VALUES (new.id,new.title,new.description,new.company,new.location,new.category,new.skills_json);
END;

CREATE TRIGGER IF NOT EXISTS jobs_ad AFTER DELETE ON jobs BEGIN
  INSERT INTO jobs_fts(jobs_fts,rowid,title,description,company,location,category,skills)
  VALUES('delete',old.id,old.title,old.description,old.company,old.location,old.category,old.skills_json);
END;

CREATE TRIGGER IF NOT EXISTS jobs_au AFTER UPDATE ON jobs BEGIN
  INSERT INTO jobs_fts(jobs_fts,rowid,title,description,company,location,category,skills)
  VALUES('delete',old.id,old.title,old.description,old.company,old.location,old.category,old.skills_json);
  INSERT INTO jobs_fts(rowid,title,description,company,location,category,skills)
  VALUES (new.id,new.title,new.description,new.company,new.location,new.category,new.skills_json);
END;
