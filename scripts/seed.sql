-- Demo data for local testing: skills, projects, resources, per-skill
-- requirements and assignments — enough for the reports, matcher and
-- availability pages to show something meaningful.
--
-- Opt-in only. Run with:
--   docker compose --profile seed run --rm seed
--
-- Safe to run repeatedly: every project and resource it creates is marked
-- created_by = 'seed' and removed on the next run, so seeding never
-- duplicates rows and never touches data you entered yourself.

BEGIN;

-- The backend applies migrations on boot, so the schema only exists once it
-- has started at least once. Fail with an explanation rather than a bare
-- "relation does not exist".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION
      'Database is not migrated yet. Start the backend once (docker compose up -d backend) so it applies migrations, then seed again.';
  END IF;
END $$;

-- ── Users ────────────────────────────────────────────────────────────────
-- Upserted by username rather than reset-by-created_by: re-seeding always
-- converges credentials back to the known password below, even if someone
-- changed them while testing login. Password for both accounts is "test" —
-- each row has its own bcrypt hash (bcrypt salts per-hash, so the two differ
-- even for the same password); verified with bcrypt.CompareHashAndPassword
-- at generation time.
INSERT INTO users (username, email, password_hash, display_name) VALUES
  ('user',  'user@test.com',  '$2a$10$OulPcaXRBHoqxUX0leSeUe4X3.BsRD54stIfQudkgdVfA1iHkO/sm', 'John Doe'),
  ('admin', 'admin@test.com', '$2a$10$2XAhVJzqh9Q23OA5fQJtietq3aulOjkHtysP0a.xukf37mVEagqum', 'Admin')
ON CONFLICT (username) DO UPDATE SET
  email         = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  display_name  = EXCLUDED.display_name;

-- ── Reset previous seed data ─────────────────────────────────────────────
-- Assignments, requirements, skill links and comments all cascade from these.
DELETE FROM projects  WHERE created_by = 'seed';
DELETE FROM resources WHERE created_by = 'seed';

-- ── Skills ───────────────────────────────────────────────────────────────
-- Left in place on reset: real projects or resources may reference them.
INSERT INTO skills (name, description) VALUES
  ('Go',         'Backend services in Go'),
  ('React',      'Frontend development with React'),
  ('PostgreSQL', 'Relational database design and tuning'),
  ('TypeScript', 'Typed JavaScript across the stack'),
  ('GraphQL',    'Schema design and resolver implementation'),
  ('Python',     'Data processing and scripting'),
  ('AWS',        'Cloud infrastructure on AWS'),
  ('Kubernetes', 'Container orchestration'),
  ('Docker',     'Containerisation and local tooling'),
  ('Figma',      'UI and interaction design')
ON CONFLICT (name) DO NOTHING;

-- ── Projects ─────────────────────────────────────────────────────────────
INSERT INTO projects (name, contact_person, phone, email, status, created_by, modified_by) VALUES
  ('Apollo CRM Rebuild',   'Sarah Mills',    '+40 721 000 111', 'sarah.mills@apollo.example',  'ACTIVE',    'seed', 'seed'),
  ('Helios Data Platform', 'Tomas Weber',    '+40 721 000 222', 'tomas.weber@helios.example',  'ACTIVE',    'seed', 'seed'),
  ('Orion Mobile App',     'Priya Raman',    '+40 721 000 333', 'priya.raman@orion.example',   'PLANNING',  'seed', 'seed'),
  ('Vega Analytics',       'Daniel Fischer', '+40 721 000 444', 'daniel.f@vega.example',       'COMPLETED', 'seed', 'seed'),
  ('Nimbus Migration',     'Laura Bennett',  '+40 721 000 555', 'laura.b@nimbus.example',      'ON_HOLD',   'seed', 'seed');

-- ── Resources ────────────────────────────────────────────────────────────
INSERT INTO resources
  (name, phone, email, status, availability, city, country, driving_licence, car, created_by, modified_by) VALUES
  ('Ana Popescu',       '+40 730 100 001', 'ana.popescu@example.com',    'FREE',      'ASAP',        'Bucharest', 'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Mihai Ionescu',     '+40 730 100 002', 'mihai.ionescu@example.com',  'FREE',      'ONE_WEEK',    'Cluj',      'Romania', TRUE,  FALSE, 'seed', 'seed'),
  ('Elena Radu',        '+40 730 100 003', 'elena.radu@example.com',     'FREE',      'ASAP',        'Bucharest', 'Romania', FALSE, FALSE, 'seed', 'seed'),
  ('Andrei Dumitru',    '+40 730 100 004', 'andrei.dumitru@example.com', 'FREE',      'TWO_WEEKS',   'Iasi',      'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Cristina Stan',     '+40 730 100 005', 'cristina.stan@example.com',  'FREE',      'ASAP',        'Timisoara', 'Romania', TRUE,  FALSE, 'seed', 'seed'),
  ('Bogdan Marin',      '+40 730 100 006', 'bogdan.marin@example.com',   'FREE',      'THREE_WEEKS', 'Brasov',    'Romania', FALSE, FALSE, 'seed', 'seed'),
  ('Ioana Nistor',      '+40 730 100 007', 'ioana.nistor@example.com',   'FREE',      'ONE_WEEK',    'Cluj',      'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Radu Constantin',   '+40 730 100 008', 'radu.c@example.com',         'FREE',      'ASAP',        'Bucharest', 'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Diana Preda',       '+40 730 100 009', 'diana.preda@example.com',    'FREE',      'TWO_WEEKS',   'Sibiu',     'Romania', FALSE, FALSE, 'seed', 'seed'),
  ('Vlad Georgescu',    '+40 730 100 010', 'vlad.g@example.com',         'FREE',      'ONE_WEEK',    'Bucharest', 'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Alexandra Barbu',   '+40 730 100 011', 'alexandra.b@example.com',    'FREE',      'ASAP',        'Cluj',      'Romania', TRUE,  FALSE, 'seed', 'seed'),
  ('Sorin Dinu',        '+40 730 100 012', 'sorin.dinu@example.com',     'FREE',      'THREE_WEEKS', 'Iasi',      'Romania', FALSE, FALSE, 'seed', 'seed'),
  -- Deliberately has no stated availability, to exercise the "Not set" bucket.
  ('Gabriela Toma',     '+40 730 100 013', 'gabriela.toma@example.com',  'FREE',      NULL,          'Bucharest', 'Romania', TRUE,  TRUE,  'seed', 'seed'),
  ('Marius Ilie',       '+40 730 100 014', 'marius.ilie@example.com',    'BLACKLIST', 'ASAP',        'Craiova',   'Romania', FALSE, FALSE, 'seed', 'seed');

-- ── Who knows what ───────────────────────────────────────────────────────
INSERT INTO resource_skills (resource_id, skill_id)
SELECT r.id, s.id
FROM (VALUES
  ('Ana Popescu',     'Go'),         ('Ana Popescu',     'PostgreSQL'), ('Ana Popescu',     'Docker'),
  ('Mihai Ionescu',   'Go'),         ('Mihai Ionescu',   'GraphQL'),
  ('Elena Radu',      'React'),      ('Elena Radu',      'TypeScript'),
  ('Andrei Dumitru',  'React'),      ('Andrei Dumitru',  'TypeScript'), ('Andrei Dumitru',  'GraphQL'),
  ('Cristina Stan',   'Python'),     ('Cristina Stan',   'AWS'),
  ('Bogdan Marin',    'Kubernetes'), ('Bogdan Marin',    'Docker'),     ('Bogdan Marin',    'AWS'),
  ('Ioana Nistor',    'PostgreSQL'), ('Ioana Nistor',    'Python'),
  ('Radu Constantin', 'Go'),         ('Radu Constantin', 'Kubernetes'),
  ('Diana Preda',     'Figma'),      ('Diana Preda',     'React'),
  ('Vlad Georgescu',  'AWS'),        ('Vlad Georgescu',  'Docker'),     ('Vlad Georgescu',  'Kubernetes'),
  ('Alexandra Barbu', 'GraphQL'),    ('Alexandra Barbu', 'TypeScript'), ('Alexandra Barbu', 'React'),
  ('Sorin Dinu',      'Python'),
  ('Gabriela Toma',   'Go'),         ('Gabriela Toma',   'React'),      ('Gabriela Toma',   'PostgreSQL'),
  ('Marius Ilie',     'Docker')
) AS v(resource_name, skill_name)
JOIN resources r ON r.name = v.resource_name AND r.created_by = 'seed'
JOIN skills    s ON s.name = v.skill_name
ON CONFLICT DO NOTHING;

-- ── Skills each project is tagged with ───────────────────────────────────
INSERT INTO project_skills (project_id, skill_id)
SELECT p.id, s.id
FROM (VALUES
  ('Apollo CRM Rebuild',   'Go'),         ('Apollo CRM Rebuild',   'React'),      ('Apollo CRM Rebuild',   'PostgreSQL'),
  ('Helios Data Platform', 'Python'),     ('Helios Data Platform', 'AWS'),        ('Helios Data Platform', 'Kubernetes'),
  ('Orion Mobile App',     'React'),      ('Orion Mobile App',     'TypeScript'),
  ('Vega Analytics',       'GraphQL'),    ('Vega Analytics',       'Go'),
  ('Nimbus Migration',     'Docker'),     ('Nimbus Migration',     'Kubernetes')
) AS v(project_name, skill_name)
JOIN projects p ON p.name = v.project_name AND p.created_by = 'seed'
JOIN skills   s ON s.name = v.skill_name
ON CONFLICT DO NOTHING;

-- ── How many people each project needs, per skill ────────────────────────
INSERT INTO project_skill_requirements (project_id, skill_id, needed_count)
SELECT p.id, s.id, v.needed
FROM (VALUES
  ('Apollo CRM Rebuild',   'Go',         3),
  ('Apollo CRM Rebuild',   'React',      2),
  ('Apollo CRM Rebuild',   'PostgreSQL', 1),
  ('Helios Data Platform', 'Python',     2),
  ('Helios Data Platform', 'AWS',        2),
  ('Helios Data Platform', 'Kubernetes', 1),
  ('Orion Mobile App',     'React',      2),
  ('Orion Mobile App',     'TypeScript', 2),
  ('Vega Analytics',       'GraphQL',    1),
  ('Vega Analytics',       'Go',         1),
  ('Nimbus Migration',     'Docker',     1),
  ('Nimbus Migration',     'Kubernetes', 2)
) AS v(project_name, skill_name, needed)
JOIN projects p ON p.name = v.project_name AND p.created_by = 'seed'
JOIN skills   s ON s.name = v.skill_name
ON CONFLICT (project_id, skill_id) DO UPDATE SET needed_count = EXCLUDED.needed_count;

-- ── Assignments, each tagged with the requirement slot it fills ──────────
-- Leaves a deliberate mix: one project fully staffed, one untouched, the
-- rest partially filled, and Vlad Georgescu on two projects at once.
INSERT INTO project_assignments (project_id, resource_id, skill_id)
SELECT p.id, r.id, s.id
FROM (VALUES
  ('Apollo CRM Rebuild',   'Ana Popescu',     'Go'),
  ('Apollo CRM Rebuild',   'Mihai Ionescu',   'Go'),
  ('Apollo CRM Rebuild',   'Elena Radu',      'React'),
  ('Helios Data Platform', 'Cristina Stan',   'Python'),
  ('Helios Data Platform', 'Vlad Georgescu',  'AWS'),
  ('Vega Analytics',       'Alexandra Barbu', 'GraphQL'),
  ('Vega Analytics',       'Radu Constantin', 'Go'),
  ('Nimbus Migration',     'Bogdan Marin',    'Kubernetes'),
  ('Nimbus Migration',     'Vlad Georgescu',  'Docker')
) AS v(project_name, resource_name, skill_name)
JOIN projects  p ON p.name = v.project_name  AND p.created_by = 'seed'
JOIN resources r ON r.name = v.resource_name AND r.created_by = 'seed'
JOIN skills    s ON s.name = v.skill_name
ON CONFLICT (project_id, resource_id) DO UPDATE SET skill_id = EXCLUDED.skill_id;

-- resources.status is a denormalization of "has at least one assignment",
-- maintained by the app on assign/unassign — the seed must leave it agreeing
-- with the rows it just inserted, and must not override BLACKLIST.
UPDATE resources SET status = 'ASSIGNED_TO_PROJECT'
WHERE created_by = 'seed'
  AND status <> 'BLACKLIST'
  AND EXISTS (SELECT 1 FROM project_assignments pa WHERE pa.resource_id = resources.id);

COMMIT;

\echo ''
\echo 'Seed complete:'
SELECT
  (SELECT COUNT(*) FROM users)                                        AS users,
  (SELECT COUNT(*) FROM skills)                                       AS skills,
  (SELECT COUNT(*) FROM projects  WHERE created_by = 'seed')          AS projects,
  (SELECT COUNT(*) FROM resources WHERE created_by = 'seed')          AS resources,
  (SELECT COUNT(*) FROM project_skill_requirements)                   AS requirements,
  (SELECT COUNT(*) FROM project_assignments)                          AS assignments;
