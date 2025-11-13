PRAGMA foreign_keys = ON;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

-- User accounts for system access (admins, staff, volunteers)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'volunteer' CHECK(role IN ('admin', 'staff', 'volunteer')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login    TEXT,
  CONSTRAINT email_format CHECK (email LIKE '%_@__%.__%')
);

-- Sessions for authentication (optional, for token-based auth)
CREATE TABLE IF NOT EXISTS sessions (
  id            TEXT PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,
  expires_at    TEXT NOT NULL,
  created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ip_address    TEXT,
  user_agent    TEXT
);

-- ============================================
-- VOLUNTEERS
-- ============================================

CREATE TABLE IF NOT EXISTS volunteers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  email             TEXT UNIQUE NOT NULL,
  phone             TEXT,
  alternate_phone   TEXT,
  address           TEXT,
  city              TEXT,
  state             TEXT,
  zip_code          TEXT,
  
  -- Emergency contact
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  
  -- Status and preferences
  status            TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive', 'On-hold', 'Archived')),
  availability      TEXT,  -- JSON or comma-separated: "weekdays,evenings"
  skills            TEXT,  -- JSON or comma-separated: "spanish,driving,cooking"
  interests         TEXT,  -- Areas of interest
  
  -- Communication preferences
  email_notifications   INTEGER DEFAULT 1,
  sms_notifications     INTEGER DEFAULT 0,
  newsletter_subscribed INTEGER DEFAULT 1,
  
  -- Dates
  joined_at         TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_active       TEXT,
  created_at        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at        TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  
  -- Notes
  notes             TEXT,
  
  CONSTRAINT email_format CHECK (email LIKE '%_@__%.__%')
);

-- ============================================
-- EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  description   TEXT,
  
  -- Dates and times
  start_date    TEXT NOT NULL,
  end_date      TEXT,
  start_time    TEXT,
  end_time      TEXT,
  
  -- Location
  location      TEXT,
  address       TEXT,
  city          TEXT,
  state         TEXT,
  zip_code      TEXT,
  
  -- Event details
  event_type    TEXT CHECK(event_type IN ('volunteer', 'fundraiser', 'training', 'meeting', 'community', 'other')),
  status        TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('draft', 'scheduled', 'in-progress', 'completed', 'cancelled')),
  capacity      INTEGER,
  registered_count INTEGER DEFAULT 0,
  
  -- Contact
  organizer_name  TEXT,
  organizer_email TEXT,
  organizer_phone TEXT,
  
  -- Requirements
  requirements    TEXT,  -- Skills or items needed
  min_volunteers  INTEGER,
  max_volunteers  INTEGER,
  
  -- Metadata
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR date(end_date) >= date(start_date))
);

-- ============================================
-- EVENT REGISTRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS event_registrations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  volunteer_id    INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  
  status          TEXT NOT NULL DEFAULT 'registered' CHECK(status IN ('registered', 'confirmed', 'attended', 'cancelled', 'no-show')),
  registered_at   TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  confirmed_at    TEXT,
  notes           TEXT,
  
  UNIQUE(event_id, volunteer_id)
);

-- ============================================
-- HOURS LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS hours_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  volunteer_id    INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  event_id        INTEGER REFERENCES events(id) ON DELETE SET NULL,
  
  date            TEXT NOT NULL,
  hours           REAL NOT NULL CHECK(hours > 0 AND hours <= 24),
  
  -- Approval workflow
  status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TEXT,
  
  notes           TEXT,
  created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================
-- VOLUNTEER NOTES / ACTIVITY LOG
-- ============================================

CREATE TABLE IF NOT EXISTS volunteer_notes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  volunteer_id    INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note_type       TEXT CHECK(note_type IN ('general', 'phone_call', 'email', 'meeting', 'incident', 'achievement')),
  note            TEXT NOT NULL,
  is_private      INTEGER DEFAULT 0,  -- Only visible to admins
  created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ============================================
-- CATEGORIES / TAGS
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT UNIQUE NOT NULL,
  category_type   TEXT CHECK(category_type IN ('volunteer_skill', 'event_type', 'general')),
  description     TEXT,
  created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Many-to-many relationship for volunteer categories
CREATE TABLE IF NOT EXISTS volunteer_categories (
  volunteer_id    INTEGER NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (volunteer_id, category_id)
);

-- Many-to-many relationship for event categories
CREATE TABLE IF NOT EXISTS event_categories (
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id     INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Volunteers
CREATE INDEX IF NOT EXISTS idx_volunteers_email ON volunteers(email);
CREATE INDEX IF NOT EXISTS idx_volunteers_status ON volunteers(status);
CREATE INDEX IF NOT EXISTS idx_volunteers_user_id ON volunteers(user_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_joined ON volunteers(joined_at);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- Event Registrations
CREATE INDEX IF NOT EXISTS idx_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_volunteer ON event_registrations(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON event_registrations(status);

-- Hours Logs
CREATE INDEX IF NOT EXISTS idx_hours_date ON hours_logs(date);
CREATE INDEX IF NOT EXISTS idx_hours_volunteer ON hours_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_hours_event ON hours_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_hours_status ON hours_logs(status);

-- Volunteer Notes
CREATE INDEX IF NOT EXISTS idx_notes_volunteer ON volunteer_notes(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_notes_created ON volunteer_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_type ON volunteer_notes(note_type);

-- ============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================

-- Update volunteers.updated_at on changes
CREATE TRIGGER IF NOT EXISTS trigger_volunteers_updated_at
AFTER UPDATE ON volunteers
FOR EACH ROW
BEGIN
  UPDATE volunteers SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- Update users.updated_at on changes
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- Update events.updated_at on changes
CREATE TRIGGER IF NOT EXISTS trigger_events_updated_at
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
  UPDATE events SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- Update hours_logs.updated_at on changes
CREATE TRIGGER IF NOT EXISTS trigger_hours_updated_at
AFTER UPDATE ON hours_logs
FOR EACH ROW
BEGIN
  UPDATE hours_logs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE id = NEW.id;
END;

-- Update event registered_count when registrations change
CREATE TRIGGER IF NOT EXISTS trigger_event_count_insert
AFTER INSERT ON event_registrations
FOR EACH ROW
WHEN NEW.status IN ('registered', 'confirmed', 'attended')
BEGIN
  UPDATE events 
  SET registered_count = (
    SELECT COUNT(*) FROM event_registrations 
    WHERE event_id = NEW.event_id 
    AND status IN ('registered', 'confirmed', 'attended')
  )
  WHERE id = NEW.event_id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_event_count_update
AFTER UPDATE ON event_registrations
FOR EACH ROW
BEGIN
  UPDATE events 
  SET registered_count = (
    SELECT COUNT(*) FROM event_registrations 
    WHERE event_id = NEW.event_id 
    AND status IN ('registered', 'confirmed', 'attended')
  )
  WHERE id = NEW.event_id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_event_count_delete
AFTER DELETE ON event_registrations
FOR EACH ROW
BEGIN
  UPDATE events 
  SET registered_count = (
    SELECT COUNT(*) FROM event_registrations 
    WHERE event_id = OLD.event_id 
    AND status IN ('registered', 'confirmed', 'attended')
  )
  WHERE id = OLD.event_id;
END;
