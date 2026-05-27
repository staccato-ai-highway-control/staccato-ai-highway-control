-- Rollback chat -> users FKs on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

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

ALTER TABLE chat_rooms
  ADD CONSTRAINT chat_rooms_ibfk_2
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE chat_room_members
  ADD CONSTRAINT chat_room_members_ibfk_2
  FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_ibfk_3
  FOREIGN KEY (sender_user_id) REFERENCES users(id);

ALTER TABLE chat_message_reads
  ADD CONSTRAINT chat_message_reads_ibfk_2
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
    'chat_rooms_ibfk_2',
    'chat_room_members_ibfk_2',
    'chat_messages_ibfk_3',
    'chat_message_reads_ibfk_2'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
