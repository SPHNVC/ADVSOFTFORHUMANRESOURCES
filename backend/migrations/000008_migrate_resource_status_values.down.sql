-- Revert migrated rows (best-effort; ASSIGNED_TO_PROJECT value cannot be dropped from the enum)
UPDATE resources SET status = 'FREE' WHERE status = 'ASSIGNED_TO_PROJECT';
