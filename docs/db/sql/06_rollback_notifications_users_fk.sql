-- Rollback notifications -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

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

ALTER TABLE notifications
  ADD CONSTRAINT notifications_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE notification_deliveries
  ADD CONSTRAINT notification_deliveries_ibfk_2
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
    'notifications_ibfk_1',
    'notification_deliveries_ibfk_2'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
