-- Rollback ai_models -> users FK on staccato_test only
-- Do not run on production DB

SELECT DATABASE() AS current_database;
SELECT CURRENT_USER() AS current_db_user;

SELECT
  'ai_models.owner_user_id' AS target,
  COUNT(*) AS orphan_count
FROM ai_models m
LEFT JOIN users u ON m.owner_user_id = u.id
WHERE m.owner_user_id IS NOT NULL
  AND u.id IS NULL;

ALTER TABLE ai_models
  ADD CONSTRAINT ai_models_ibfk_1
  FOREIGN KEY (owner_user_id) REFERENCES users(id);

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ai_models'
  AND COLUMN_NAME = 'owner_user_id'
  AND CONSTRAINT_NAME = 'ai_models_ibfk_1'
ORDER BY TABLE_NAME, COLUMN_NAME;
