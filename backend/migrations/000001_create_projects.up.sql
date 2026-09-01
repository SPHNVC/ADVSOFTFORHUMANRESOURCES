CREATE TABLE IF NOT EXISTS projects (
    id            BIGSERIAL PRIMARY KEY,
    name          TEXT        NOT NULL,
    contact_person TEXT       NOT NULL,
    phone         TEXT,
    email         TEXT,
    created_by    TEXT        NOT NULL DEFAULT 'system',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_by   TEXT        NOT NULL DEFAULT 'system',
    modified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_name ON projects (name);
