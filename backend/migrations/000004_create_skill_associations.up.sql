CREATE TABLE IF NOT EXISTS project_skills (
    project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    skill_id    BIGINT NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
    PRIMARY KEY (project_id, skill_id)
);

CREATE TABLE IF NOT EXISTS resource_skills (
    resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    skill_id    BIGINT NOT NULL REFERENCES skills(id)    ON DELETE CASCADE,
    PRIMARY KEY (resource_id, skill_id)
);
