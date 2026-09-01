-- Project lifecycle status. TEXT + CHECK rather than a Postgres enum: enum labels
-- cannot be dropped and have already forced three fix-up migrations here.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PLANNING'
  CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'));

-- How many resources a project needs, broken down per skill.
CREATE TABLE IF NOT EXISTS project_skill_requirements (
    project_id   BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id     BIGINT NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
    needed_count INT    NOT NULL DEFAULT 1 CHECK (needed_count > 0),
    PRIMARY KEY (project_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_psr_skill ON project_skill_requirements (skill_id);

-- Which requirement slot an assignment fills. Nullable: pre-existing rows stay
-- valid as generic assignments that count toward the project total only.
ALTER TABLE project_assignments
  ADD COLUMN IF NOT EXISTS skill_id BIGINT REFERENCES skills(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_project_assignments_skill ON project_assignments (skill_id);

-- Matching and report queries start from skill_id; the composite primary keys on
-- these join tables only index the leading column.
CREATE INDEX IF NOT EXISTS idx_resource_skills_skill ON resource_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_project_skills_skill  ON project_skills  (skill_id);
