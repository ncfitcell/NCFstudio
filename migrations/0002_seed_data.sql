-- Seed roles
INSERT OR IGNORE INTO roles (key, label, description) VALUES
('leadership', 'Studio Leadership', 'Studio Directors, Partners, Investment Committee. Full visibility + approval rights.'),
('core', 'Studio Core Team', 'Head of Product, Tech Leads, Growth Lead, Legal/IP Head. Platform & shared services access.'),
('eir', 'EIR / Venture Founder', 'Entrepreneurs-in-Residence, Portfolio Founders, CEOs.'),
('academic', 'Academic Partner / Dean', 'University Deans, Department Heads, Research Chairs.'),
('investor', 'VC & Investor Network', 'Angel Investors, Partner VCs, CSR Sponsors.'),
('mentor', 'Advisor & Mentor', 'Industry Experts & Subject Matter Experts.'),
('portfolio_team', 'Portfolio Team Member', 'Engineers/Staff of specific portfolio ventures.'),
('corporate', 'Corporate Partner', 'Enterprise & Industry partners.'),
('talent', 'Talent Pool / Candidate', 'Potential co-founders, researchers, interns.');

-- Seed admin user (username: admin / password: ncfvs)
-- Password hash generated via PBKDF2-SHA256 (100k iterations, SHA-256, 32 bytes) using Node crypto.pbkdf2Sync
-- Format: "saltHex:hashHex" — matches verifyPassword() in src/lib/auth.ts
INSERT OR IGNORE INTO users (id, username, password_hash, name, email, title, is_admin, active)
VALUES (1, 'admin', '7c9713dd40408d50949bde1b46b6cd34:f7858e9ad76e18bb12173de19b27436584cad71e00e98d88ee204a009f9104e6', 'Studio Admin', 'admin@ncfventurestudio.com', 'Founder & Managing Partner', 1, 1);

INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT 1, id FROM roles WHERE key = 'leadership';

-- Seed sample roadmap
INSERT OR IGNORE INTO roadmap_items (id, title, description, quarter, status, order_index) VALUES
(1, 'Studio Platform Launch', 'Launch internal operations hub replacing Discord workflows', 'Q1 2026', 'done', 1),
(2, 'First Cohort of 5 Ventures', 'Onboard first cohort of ventures into Stage 01 Ideation', 'Q1 2026', 'done', 2),
(3, 'Academic Partner Network', 'Sign MoUs with 3 universities for Incubator-in-a-Box', 'Q2 2026', 'in_progress', 3),
(4, 'First Spin-out & Seed Round', 'Graduate first venture through Stage Gate 2 and close seed round', 'Q3 2026', 'planned', 4),
(5, 'Investor Syndicate Network', 'Formalize syndicate of 20+ angel investors and 5 partner VCs', 'Q4 2026', 'planned', 5);
