-- Check chat -> users FKs before dry-run
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
    (TABLE_NAME = 'chat_rooms' AND COLUMN_NAME = 'created_by')
    OR (TABLE_NAME = 'chat_room_members' AND COLUMN_NAME = 'user_id')
    OR (TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'sender_user_id')
    OR (TABLE_NAME = 'chat_message_reads' AND COLUMN_NAME = 'user_id')
  )
ORDER BY TABLE_NAME, COLUMN_NAME;

SELECT
  'chat_rooms.created_by' AS target,
  COUNT(*) AS orphan_count
FROM chat_rooms r
LEFT JOIN users u ON r.created_by = u.id
WHERE r.created_by IS NOT NULL
  AND u.id IS NULL;

SELECT
  'chat_room_members.user_id' AS target,
  COUNT(*) AS orphan_count
FROM chat_room_members m
LEFT JOIN users u ON m.user_id = u.id
WHERE m.user_id IS NOT NULL
  AND u.id IS NULL;

SELECT
  'chat_messages.sender_user_id' AS target,
  COUNT(*) AS orphan_count
FROM chat_messages m
LEFT JOIN users u ON m.sender_user_id = u.id
WHERE m.sender_user_id IS NOT NULL
  AND u.id IS NULL;

SELECT
  'chat_message_reads.user_id' AS target,
  COUNT(*) AS orphan_count
FROM chat_message_reads r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.user_id IS NOT NULL
  AND u.id IS NULL;
