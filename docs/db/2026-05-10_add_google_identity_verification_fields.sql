-- STACCATO Google identity verification migration
-- Purpose:
--   Add identity verification metadata for EMAIL / GOOGLE verification methods.
--
-- Notes:
--   MVP supports EMAIL and GOOGLE identity verification.
--   Kakao identity verification is intentionally excluded from MVP.
--   Existing email-verified users are backfilled as EMAIL.
--   is_email_verified remains the MVP verification completion flag.

ALTER TABLE users
ADD COLUMN identity_provider VARCHAR(30) NULL AFTER is_email_verified;

ALTER TABLE users
ADD COLUMN identity_provider_user_id VARCHAR(255) NULL AFTER identity_provider;

ALTER TABLE users
ADD COLUMN identity_verified_at DATETIME NULL AFTER identity_provider_user_id;

CREATE TABLE IF NOT EXISTS identity_oauth_states (
    id BIGINT NOT NULL AUTO_INCREMENT,
    provider VARCHAR(30) NOT NULL,
    target_email VARCHAR(255) NOT NULL,
    state_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_identity_oauth_states_state_hash (state_hash),
    KEY idx_identity_oauth_states_provider_status (provider, status),
    KEY idx_identity_oauth_states_target_email (target_email)
);

UPDATE users
SET
    identity_provider = COALESCE(identity_provider, 'EMAIL'),
    identity_verified_at = COALESCE(identity_verified_at, updated_at, approved_at, created_at)
WHERE is_email_verified = 1;
