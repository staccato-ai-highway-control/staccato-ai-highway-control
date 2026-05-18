-- Drop chatbot -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

ALTER TABLE chatbot_messages
  DROP FOREIGN KEY chatbot_messages_ibfk_3;

ALTER TABLE chatbot_conversations
  DROP FOREIGN KEY chatbot_conversations_ibfk_1;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('chatbot_conversations', 'chatbot_messages')
  AND COLUMN_NAME = 'user_id'
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
