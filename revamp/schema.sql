PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS volunteers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  joined_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  location      TEXT,
  description   TEXT
);

CREATE TABLE IF NOT EXISTS hours_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  volunteer_id    INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  event_id        INTEGER REFERENCES events(id) ON DELETE SET NULL,
  date            TEXT NOT NULL,
  hours           REAL NOT NULL,
  notes           TEXT,
  created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_hours_date        ON hours_logs(date);
CREATE INDEX IF NOT EXISTS idx_hours_volunteer   ON hours_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_hours_event       ON hours_logs(event_id);
