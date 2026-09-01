CREATE TYPE resource_status AS ENUM (
    'NEW',
    'IN_PROCESS',
    'ASSIGNED',
    'BLACKLIST'
);

CREATE TABLE IF NOT EXISTS resources (
    id             BIGSERIAL    PRIMARY KEY,
    name           TEXT         NOT NULL,
    phone          TEXT,
    email          TEXT,
    status         resource_status NOT NULL DEFAULT 'NEW',
    profile_status BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by     TEXT         NOT NULL DEFAULT 'system',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    modified_by    TEXT         NOT NULL DEFAULT 'system',
    modified_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resources_status ON resources (status);
