-- Check auth/signup -> users FKs before dry-run
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
    (TABLE_NAME = 'email_verifications' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'signup_requests' AND COLUMN_NAME = 'user_id')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT
  'email_verifications.user_id' AS target,
  COUNT(*) AS orphan_count
FROM email_verifications e
LEFT JOIN users u ON e.user_id = u.id
WHERE e.user_id IS NOT NULL
  AND u.id IS NULL;

SELECT
  'signup_requests.user_id' AS target,
  COUNT(*) AS orphan_count
FROM signup_requests s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.user_id IS NOT NULL
  AND u.id IS NULL;
