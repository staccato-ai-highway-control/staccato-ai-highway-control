-- Check notifications -> users FKs before dry-run
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
    (TABLE_NAME = 'notifications' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'notification_deliveries' AND COLUMN_NAME = 'user_id')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT
  'notifications.user_id' AS target,
  COUNT(*) AS orphan_count
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.user_id IS NOT NULL
  AND u.id IS NULL;

SELECT
  'notification_deliveries.user_id' AS target,
  COUNT(*) AS orphan_count
FROM notification_deliveries d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.user_id IS NOT NULL
  AND u.id IS NULL;
