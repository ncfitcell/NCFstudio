-- NCF Venture Studio - PostgreSQL Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/zejpkbbavgrcvcwyvohu/sql

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROLES
CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT
);

-- USER <-> ROLE
CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- VENTURES
CREATE TABLE IF NOT EXISTS ventures (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_emoji TEXT DEFAULT '🚀',
  stage TEXT DEFAULT 'ideation',
  sector TEXT,
  status TEXT DEFAULT 'active',
  is_dealflow INTEGER DEFAULT 0,
  ask_amount TEXT,
  valuation TEXT,
  traction_summary TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VENTURE MEMBERS
CREATE TABLE IF NOT EXISTS venture_members (
  venture_id BIGINT NOT NULL REFERENCES ventures(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_in_venture TEXT DEFAULT 'member',
  PRIMARY KEY (venture_id, user_id)
);

-- POSTS
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  channel_key TEXT NOT NULL,
  author_id BIGINT REFERENCES users(id),
  title TEXT,
  content TEXT NOT NULL,
  meta TEXT,
  pinned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMENTS
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id BIGINT REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  priority TEXT DEFAULT 'medium',
  assignee_id BIGINT REFERENCES users(id),
  created_by BIGINT REFERENCES users(id),
  due_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  doc_type TEXT DEFAULT 'file',
  url TEXT,
  version TEXT DEFAULT 'v1.0',
  status TEXT DEFAULT 'active',
  uploaded_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GATES
CREATE TABLE IF NOT EXISTS gates (
  id BIGSERIAL PRIMARY KEY,
  channel_key TEXT NOT NULL,
  venture_id BIGINT REFERENCES ventures(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- GATE VOTES
CREATE TABLE IF NOT EXISTS gate_votes (
  id BIGSERIAL PRIMARY KEY,
  gate_id BIGINT NOT NULL REFERENCES gates(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  vote TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gate_id, user_id)
);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id BIGSERIAL PRIMARY KEY,
  channel_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date TEXT NOT NULL,
  event_type TEXT DEFAULT 'event',
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT RSVPS
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'going',
  PRIMARY KEY (event_id, user_id)
);

-- METRICS
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  venture_id BIGINT NOT NULL REFERENCES ventures(id),
  month TEXT NOT NULL,
  mrr REAL DEFAULT 0,
  burn_rate REAL DEFAULT 0,
  runway_months REAL DEFAULT 0,
  growth_rate REAL DEFAULT 0,
  headcount INTEGER DEFAULT 0,
  notes TEXT,
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(venture_id, month)
);

-- JOBS
CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  venture_id BIGINT REFERENCES ventures(id),
  title TEXT NOT NULL,
  description TEXT,
  job_type TEXT DEFAULT 'full-time',
  location TEXT DEFAULT 'Remote',
  status TEXT DEFAULT 'open',
  created_by BIGINT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROADMAP ITEMS
CREATE TABLE IF NOT EXISTS roadmap_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  status TEXT DEFAULT 'planned',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- =============================================
-- SEED DATA
-- =============================================

-- Roles
INSERT INTO roles (key, label, description) VALUES
('leadership', 'Studio Leadership', 'Studio Directors, Partners, Investment Committee. Full visibility + approval rights.'),
('core', 'Studio Core Team', 'Head of Product, Tech Leads, Growth Lead, Legal/IP Head. Platform & shared services access.'),
('eir', 'EIR / Venture Founder', 'Entrepreneurs-in-Residence, Portfolio Founders, CEOs.'),
('academic', 'Academic Partner / Dean', 'University Deans, Department Heads, Research Chairs.'),
('investor', 'VC & Investor Network', 'Angel Investors, Partner VCs, CSR Sponsors.'),
('mentor', 'Advisor & Mentor', 'Industry Experts & Subject Matter Experts.'),
('portfolio_team', 'Portfolio Team Member', 'Engineers/Staff of specific portfolio ventures.'),
('corporate', 'Corporate Partner', 'Enterprise & Industry partners.'),
('talent', 'Talent Pool / Candidate', 'Potential co-founders, researchers, interns.')
ON CONFLICT (key) DO NOTHING;

-- Admin user (username: admin / password: ncfvs)
-- PBKDF2-SHA256 hash, 100k iterations
INSERT INTO users (id, username, password_hash, name, email, title, is_admin, active)
VALUES (1, 'admin', '7c9713dd40408d50949bde1b46b6cd34:f7858e9ad76e18bb12173de19b27436584cad71e00e98d88ee204a009f9104e6', 'Studio Admin', 'admin@ncfventurestudio.com', 'Founder & Managing Partner', 1, 1)
ON CONFLICT (username) DO NOTHING;

-- Reset the BIGSERIAL sequence so new users get id > 1
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

INSERT INTO user_roles (user_id, role_id) SELECT 1, id FROM roles WHERE key = 'leadership'
ON CONFLICT DO NOTHING;

-- Sample roadmap
INSERT INTO roadmap_items (id, title, description, quarter, status, order_index) VALUES
(1, 'Studio Platform Launch', 'Launch internal operations hub replacing Discord workflows', 'Q1 2026', 'done', 1),
(2, 'First Cohort of 5 Ventures', 'Onboard first cohort of ventures into Stage 01 Ideation', 'Q1 2026', 'done', 2),
(3, 'Academic Partner Network', 'Sign MoUs with 3 universities for Incubator-in-a-Box', 'Q2 2026', 'in_progress', 3),
(4, 'First Spin-out & Seed Round', 'Graduate first venture through Stage Gate 2 and close seed round', 'Q3 2026', 'planned', 4),
(5, 'Investor Syndicate Network', 'Formalize syndicate of 20+ angel investors and 5 partner VCs', 'Q4 2026', 'planned', 5)
ON CONFLICT DO NOTHING;

SELECT setval('roadmap_items_id_seq', (SELECT MAX(id) FROM roadmap_items));

-- =============================================
-- EXEC RAW SQL FUNCTION (required by db adapter)
-- This function lets the app run raw parameterized SQL via RPC
-- =============================================

CREATE OR REPLACE FUNCTION exec_raw_sql(sql TEXT, params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  upper_trimmed TEXT;
BEGIN
  upper_trimmed := upper(trim(sql));

  IF upper_trimmed LIKE 'SELECT%' OR upper_trimmed LIKE 'WITH%' THEN
    EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || sql || ') t'
      INTO result;
  ELSIF upper(sql) LIKE '%RETURNING%' THEN
    EXECUTE 'WITH _r AS (' || sql || ') SELECT COALESCE(jsonb_agg(row_to_json(_r)), ''[]''::jsonb) FROM _r'
      INTO result;
  ELSE
    EXECUTE sql;
    result := '[]'::JSONB;
  END IF;
  RETURN COALESCE(result, '[]'::JSONB);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'exec_raw_sql error: % | SQL: %', SQLERRM, sql;
END;
$$;
