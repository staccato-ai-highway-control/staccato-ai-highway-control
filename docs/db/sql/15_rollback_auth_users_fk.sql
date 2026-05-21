-- Rollback auth/signup -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

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

ALTER TABLE email_verifications
  ADD CONSTRAINT email_verifications_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE signup_requests
  ADD CONSTRAINT signup_requests_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND CONSTRAINT_NAME IN (
    'email_verifications_ibfk_1',
    'signup_requests_ibfk_1'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
