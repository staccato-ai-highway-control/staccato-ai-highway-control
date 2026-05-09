-- STACCATO login_id migration
-- Purpose:
--   Change login method from email-based login to login_id-based login.
--
-- Notes:
--   Run this only after backing up the database.
--   Existing users must receive unique login_id values before adding NOT NULL + UNIQUE.
--   If the column or index already exists, adjust the statements manually for the target DB.

ALTER TABLE users
ADD COLUMN login_id VARCHAR(50) NULL AFTER id;

UPDATE users
SET login_id = 'superadmin'
WHERE email = 'superadmin@staccato.local';

UPDATE users
SET login_id = 'controladmin'
WHERE email = 'control-admin@staccato.local';

UPDATE users
SET login_id = 'dispatchadmin'
WHERE email = 'dispatch-admin@staccato.local';

UPDATE users
SET login_id = 'viewer'
WHERE email = 'viewer@staccato.local';

-- For any remaining users, assign login_id manually before continuing.
SELECT id, email, login_id
FROM users
WHERE login_id IS NULL OR login_id = '';

-- Check duplicate login_id before adding unique index.
SELECT login_id, COUNT(*) AS cnt
FROM users
GROUP BY login_id
HAVING cnt > 1;

ALTER TABLE users
MODIFY login_id VARCHAR(50) NOT NULL;

ALTER TABLE users
ADD UNIQUE INDEX uq_users_login_id (login_id);
