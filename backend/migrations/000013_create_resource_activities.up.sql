CREATE TABLE IF NOT EXISTS resource_activities (
    id           BIGSERIAL PRIMARY KEY,
    resource_id  BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    description  TEXT,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    modified_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resource_activities_resource_id ON resource_activities (resource_id);
