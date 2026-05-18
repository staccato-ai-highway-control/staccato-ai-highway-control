-- Rollback training -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

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

ALTER TABLE training_datasets
  ADD CONSTRAINT training_datasets_ibfk_1
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE training_jobs
  ADD CONSTRAINT training_jobs_ibfk_5
  FOREIGN KEY (requested_by) REFERENCES users(id);

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_NAME IN (
    'training_datasets_ibfk_1',
    'training_jobs_ibfk_5'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
