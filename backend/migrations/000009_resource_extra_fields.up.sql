CREATE TYPE availability_status AS ENUM ('ASAP', 'ONE_WEEK', 'TWO_WEEKS', 'THREE_WEEKS');

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS street          TEXT,
  ADD COLUMN IF NOT EXISTS number          TEXT,
  ADD COLUMN IF NOT EXISTS block           TEXT,
  ADD COLUMN IF NOT EXISTS flat            TEXT,
  ADD COLUMN IF NOT EXISTS zip_code        TEXT,
  ADD COLUMN IF NOT EXISTS city            TEXT,
  ADD COLUMN IF NOT EXISTS county          TEXT,
  ADD COLUMN IF NOT EXISTS country         TEXT,
  ADD COLUMN IF NOT EXISTS driving_licence BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS car             BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS availability    availability_status;
