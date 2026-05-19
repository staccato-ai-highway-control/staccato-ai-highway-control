-- Check chatbot -> users FKs before dry-run
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
    (TABLE_NAME = 'chatbot_conversations' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'chatbot_messages' AND COLUMN_NAME = 'user_id')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT
  'chatbot_conversations.user_id' AS target,
  COUNT(*) AS orphan_count
FROM chatbot_conversations c
LEFT JOIN users u ON c.user_id = u.id
WHERE c.user_id IS NOT NULL
  AND u.id IS NULL;

SELECT
  'chatbot_messages.user_id' AS target,
  COUNT(*) AS orphan_count
FROM chatbot_messages m
LEFT JOIN users u ON m.user_id = u.id
WHERE m.user_id IS NOT NULL
  AND u.id IS NULL;
