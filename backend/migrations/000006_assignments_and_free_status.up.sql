-- Rename NEW -> FREE in the enum (requires recreating the type in Postgres)
ALTER TYPE resource_status RENAME VALUE 'NEW' TO 'FREE';

-- Persisted assignments table
CREATE TABLE IF NOT EXISTS project_assignments (
    id          BIGSERIAL   PRIMARY KEY,
    project_id  BIGINT      NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
    resource_id BIGINT      NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, resource_id)
);

CREATE INDEX idx_project_assignments_project  ON project_assignments (project_id);
CREATE INDEX idx_project_assignments_resource ON project_assignments (resource_id);
