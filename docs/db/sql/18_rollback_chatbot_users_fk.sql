-- Rollback chatbot -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

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

ALTER TABLE chatbot_conversations
  ADD CONSTRAINT chatbot_conversations_ibfk_1
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE chatbot_messages
  ADD CONSTRAINT chatbot_messages_ibfk_3
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
    'chatbot_conversations_ibfk_1',
    'chatbot_messages_ibfk_3'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

