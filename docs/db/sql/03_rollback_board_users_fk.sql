-- board -> users FK rollback SQL
-- 대상 DB: staccato_test
-- 운영 DB 실행 금지
--
-- 주의:
-- FK를 다시 추가하기 전 orphan_count가 0인지 확인해야 한다.

USE staccato_test;

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_user;

-- rollback 전 orphan 데이터 확인
SELECT 'board_posts.author_id' AS target, COUNT(*) AS orphan_count
FROM board_posts p
LEFT JOIN users u ON p.author_id = u.id
WHERE p.author_id IS NOT NULL
  AND u.id IS NULL;

SELECT 'board_comments.author_id' AS target, COUNT(*) AS orphan_count
FROM board_comments c
LEFT JOIN users u ON c.author_id = u.id
WHERE c.author_id IS NOT NULL
  AND u.id IS NULL;

SELECT 'board_attachments.uploaded_by' AS target, COUNT(*) AS orphan_count
FROM board_attachments a
LEFT JOIN users u ON a.uploaded_by = u.id
WHERE a.uploaded_by IS NOT NULL
  AND u.id IS NULL;

SELECT 'board_reactions.user_id' AS target, COUNT(*) AS orphan_count
FROM board_reactions r
LEFT JOIN users u ON r.user_id = u.id
WHERE r.user_id IS NOT NULL
  AND u.id IS NULL;

-- FK 재생성
ALTER TABLE board_posts
  ADD CONSTRAINT board_posts_ibfk_1
  FOREIGN KEY (author_id) REFERENCES users(id);

ALTER TABLE board_comments
  ADD CONSTRAINT board_comments_ibfk_3
  FOREIGN KEY (author_id) REFERENCES users(id);

ALTER TABLE board_attachments
  ADD CONSTRAINT board_attachments_ibfk_3
  FOREIGN KEY (uploaded_by) REFERENCES users(id);

ALTER TABLE board_reactions
  ADD CONSTRAINT board_reactions_ibfk_2
  FOREIGN KEY (user_id) REFERENCES users(id);

-- rollback 후 FK 확인
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'staccato_test'
  AND CONSTRAINT_NAME IN (
    'board_posts_ibfk_1',
    'board_comments_ibfk_3',
    'board_attachments_ibfk_3',
    'board_reactions_ibfk_2'
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
