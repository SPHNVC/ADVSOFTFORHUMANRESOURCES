ALTER TABLE resources DROP COLUMN IF EXISTS availability;
DROP TYPE IF EXISTS availability_status;

CREATE TYPE availability_status AS ENUM ('ASAP', 'ONE_WEEK', 'TWO_WEEKS', 'THREE_WEEKS');

ALTER TABLE resources ADD COLUMN availability availability_status;
