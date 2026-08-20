-- NCF Venture Studio - Initial Schema

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  title TEXT,
  bio TEXT,
  skills TEXT,
  avatar_color TEXT DEFAULT '#00B4D8',
  is_admin INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ROLES (fixed catalogue, seeded)
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT
);

-- USER <-> ROLE (many to many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- VENTURES (Portfolio Hubs / Dealflow)
CREATE TABLE IF NOT EXISTS ventures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_emoji TEXT DEFAULT '🚀',
  stage TEXT DEFAULT 'ideation', -- ideation, mvp, scale, dealflow, graduated
  sector TEXT,
  status TEXT DEFAULT 'active', -- active, paused, graduated
  is_dealflow INTEGER DEFAULT 0,
  ask_amount TEXT,
  valuation TEXT,
  traction_summary TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- VENTURE MEMBERS (Portfolio Team Members assigned to a venture)
CREATE TABLE IF NOT EXISTS venture_members (
  venture_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role_in_venture TEXT DEFAULT 'member',
  PRIMARY KEY (venture_id, user_id),
  FOREIGN KEY (venture_id) REFERENCES ventures(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- POSTS (generic discussion / announcement / Q&A / feed items)
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_key TEXT NOT NULL,
  author_id INTEGER,
  title TEXT,
  content TEXT NOT NULL,
  meta TEXT, -- JSON blob for extra fields (skills, tags, links etc.)
  pinned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- COMMENTS (replies on posts)
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_id INTEGER,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

-- TASKS (Kanban boards: mvp-sprints, scaleup-war-room, user-testing-feedback bugs)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog', -- backlog, todo, in_progress, review, done
  priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
  assignee_id INTEGER,
  created_by INTEGER,
  due_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignee_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- DOCUMENTS (Document vaults: legal, finance, brand, compliance, devops, academic docs, pitch decks, resumes)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT DEFAULT 'file', -- file, link, template, request
  url TEXT,
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'active', -- active, in_review, archived, pending_request
  uploaded_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- STAGE GATES (Investment committee voting: stage-1, stage-2)
CREATE TABLE IF NOT EXISTS gates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_key TEXT NOT NULL,
  venture_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open', -- open, approved, rejected
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  FOREIGN KEY (venture_id) REFERENCES ventures(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- GATE VOTES
CREATE TABLE IF NOT EXISTS gate_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gate_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  vote TEXT NOT NULL, -- approve, reject, abstain
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(gate_id, user_id),
  FOREIGN KEY (gate_id) REFERENCES gates(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- EVENTS (calendar / hackathons)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TEXT NOT NULL,
  event_type TEXT DEFAULT 'event', -- event, hackathon, workshop, deadline
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- EVENT RSVPS
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'going', -- going, interested, declined
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- METRICS (monthly investor reporting)
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venture_id INTEGER NOT NULL,
  month TEXT NOT NULL, -- YYYY-MM
  mrr REAL DEFAULT 0,
  burn_rate REAL DEFAULT 0,
  runway_months REAL DEFAULT 0,
  growth_rate REAL DEFAULT 0,
  headcount INTEGER DEFAULT 0,
  notes TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(venture_id, month),
  FOREIGN KEY (venture_id) REFERENCES ventures(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- JOBS (open roles / talent board)
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venture_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT DEFAULT 'full-time', -- full-time, part-time, internship, advisory
  location TEXT DEFAULT 'Remote',
  status TEXT DEFAULT 'open', -- open, closed
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (venture_id) REFERENCES ventures(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ROADMAP ITEMS
CREATE TABLE IF NOT EXISTS roadmap_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL, -- e.g. Q1 2026
  status TEXT DEFAULT 'planned', -- planned, in_progress, done
  order_index INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_channel ON posts(channel_key);
CREATE INDEX IF NOT EXISTS idx_tasks_channel ON tasks(channel_key);
CREATE INDEX IF NOT EXISTS idx_documents_channel ON documents(channel_key);
CREATE INDEX IF NOT EXISTS idx_gates_channel ON gates(channel_key);
CREATE INDEX IF NOT EXISTS idx_events_channel ON events(channel_key);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_metrics_venture ON metrics(venture_id);
CREATE INDEX IF NOT EXISTS idx_venture_members_user ON venture_members(user_id);
