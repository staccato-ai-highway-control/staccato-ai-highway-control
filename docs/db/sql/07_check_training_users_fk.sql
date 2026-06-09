-- Check training -> users FKs before dry-run
-- Target DB: staccato_test only

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME = 'users'
  AND (
    (TABLE_NAME = 'training_datasets' AND COLUMN_NAME = 'created_by')
    OR (TABLE_NAME = 'training_jobs' AND COLUMN_NAME = 'requested_by')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT
  'training_datasets.created_by' AS target,
  COUNT(*) AS orphan_count
FROM training_datasets d
LEFT JOIN users u ON d.created_by = u.id
WHERE d.created_by IS NOT NULL
  AND u.id IS NULL;

SELECT
  'training_jobs.requested_by' AS target,
  COUNT(*) AS orphan_count
FROM training_jobs j
LEFT JOIN users u ON j.requested_by = u.id
WHERE j.requested_by IS NOT NULL
  AND u.id IS NULL;
