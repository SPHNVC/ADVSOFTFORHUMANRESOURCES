ALTER TABLE resources DROP COLUMN IF EXISTS availability;
DROP TYPE IF EXISTS availability_status;

CREATE TYPE availability_status AS ENUM ('ASAP', '1_WEEK', '2_WEEKS', '3_WEEKS');

ALTER TABLE resources ADD COLUMN availability availability_status;
