CREATE TABLE IF NOT EXISTS project_comments (
    id         BIGSERIAL   PRIMARY KEY,
    project_id BIGINT      NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author     TEXT        NOT NULL DEFAULT 'system',
    text       TEXT        NOT NULL,
    at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_comments_project ON project_comments (project_id);

CREATE TABLE IF NOT EXISTS resource_comments (
    id          BIGSERIAL   PRIMARY KEY,
    resource_id BIGINT      NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    author      TEXT        NOT NULL DEFAULT 'system',
    text        TEXT        NOT NULL,
    at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_comments_resource ON resource_comments (resource_id);
