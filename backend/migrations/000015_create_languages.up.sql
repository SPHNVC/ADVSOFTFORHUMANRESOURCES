CREATE TABLE IF NOT EXISTS languages (
    id   BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS resource_languages (
    resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    language_id BIGINT NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
    level       TEXT   NOT NULL,
    PRIMARY KEY (resource_id, language_id),
    CONSTRAINT resource_languages_level_check
        CHECK (level IN ('A1','A2','B1','B2','C1','C2','NATIVE'))
);

-- Supports "which resources speak language X" without scanning the table.
CREATE INDEX idx_resource_languages_language_id ON resource_languages (language_id);

INSERT INTO languages (name) VALUES
    ('English'), ('Romanian'), ('German'), ('French'), ('Spanish'),
    ('Italian'), ('Portuguese'), ('Dutch'), ('Hungarian'), ('Polish'),
    ('Russian'), ('Ukrainian'), ('Greek'), ('Turkish'), ('Arabic'),
    ('Chinese'), ('Japanese')
ON CONFLICT (name) DO NOTHING;
