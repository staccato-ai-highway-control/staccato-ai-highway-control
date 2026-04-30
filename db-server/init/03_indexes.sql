-- STACCATO Index Definitions
-- This file creates indexes for query performance.

USE staccato;

-- TODO:
-- 1. incidents: cctv_id, incident_type, incident_status, detected_at
-- 2. detection_logs: incident_id, cctv_id, detected_at
-- 3. incident_reports: report_status, created_at
-- 4. notifications: user_id, is_read, created_at