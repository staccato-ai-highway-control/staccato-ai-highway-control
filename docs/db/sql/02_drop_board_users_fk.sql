-- board -> users FK 제거 SQL
-- 대상 DB: staccato_test
-- 운영 DB 실행 금지
--
-- 주의:
-- 실행 전 반드시 01_check_board_users_fk.sql 실행
-- 실행 후 반드시 pytest 재실행

USE staccato_test;

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_user;

ALTER TABLE board_posts
  DROP FOREIGN KEY board_posts_ibfk_1;

ALTER TABLE board_comments
  DROP FOREIGN KEY board_comments_ibfk_3;

ALTER TABLE board_attachments
  DROP FOREIGN KEY board_attachments_ibfk_3;

ALTER TABLE board_reactions
  DROP FOREIGN KEY board_reactions_ibfk_2;

-- 제거 후 board 관련 FK 확인
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'staccato_test'
  AND TABLE_NAME IN (
    'board_posts',
    'board_comments',
    'board_attachments',
    'board_reactions'
  )
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, COLUMN_NAME;
