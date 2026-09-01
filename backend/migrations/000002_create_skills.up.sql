CREATE TABLE IF NOT EXISTS skills (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,
    description TEXT
);
