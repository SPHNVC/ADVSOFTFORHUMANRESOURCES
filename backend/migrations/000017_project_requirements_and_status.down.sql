DROP INDEX IF EXISTS idx_project_skills_skill;
DROP INDEX IF EXISTS idx_resource_skills_skill;
DROP INDEX IF EXISTS idx_project_assignments_skill;

ALTER TABLE project_assignments DROP COLUMN IF EXISTS skill_id;

DROP TABLE IF EXISTS project_skill_requirements;

ALTER TABLE projects DROP COLUMN IF EXISTS status;
