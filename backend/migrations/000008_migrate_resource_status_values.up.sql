UPDATE resources SET status = 'FREE'                WHERE status = 'IN_PROCESS';
UPDATE resources SET status = 'ASSIGNED_TO_PROJECT' WHERE status = 'ASSIGNED';
