-- Drop training -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

ALTER TABLE training_jobs
  DROP FOREIGN KEY training_jobs_ibfk_5;

ALTER TABLE training_datasets
  DROP FOREIGN KEY training_datasets_ibfk_1;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('training_datasets', 'training_jobs')
  AND COLUMN_NAME IN ('created_by', 'requested_by')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
