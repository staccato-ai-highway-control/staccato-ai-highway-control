-- STACCATO MySQL 8.0 Initial Schema
-- This file creates core tables for the STACCATO MVP.

CREATE DATABASE IF NOT EXISTS staccato
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE staccato;

-- TODO:
-- 1. users
-- 2. signup_requests
-- 3. email_verifications
-- 4. security_logs
-- 5. cctvs
-- 6. cctv_rois
-- 7. incidents
-- 8. detection_logs
-- 9. incident_snapshots
-- 10. incident_status_histories
-- 11. incident_memos
-- 12. incident_reports
-- 13. report_attachments
-- 14. report_analysis_jobs
-- 15. notifications
-- 16. llm_reports
-- 17. ai_models
-- 18. ai_model_versions