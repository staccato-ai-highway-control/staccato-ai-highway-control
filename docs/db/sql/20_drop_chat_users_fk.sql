-- Drop chat -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

ALTER TABLE chat_message_reads
  DROP FOREIGN KEY chat_message_reads_ibfk_2;

ALTER TABLE chat_messages
  DROP FOREIGN KEY chat_messages_ibfk_3;

ALTER TABLE chat_room_members
  DROP FOREIGN KEY chat_room_members_ibfk_2;

ALTER TABLE chat_rooms
  DROP FOREIGN KEY chat_rooms_ibfk_2;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'chat_rooms' AND COLUMN_NAME = 'created_by')
    OR (TABLE_NAME = 'chat_room_members' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'sender_user_id')
    OR (TABLE_NAME = 'chat_message_reads' AND COLUMN_NAME = 'user_id')
  )
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
