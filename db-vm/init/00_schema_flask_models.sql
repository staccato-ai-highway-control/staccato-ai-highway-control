-- Generated from current Flask SQLAlchemy models and live DB schema.
-- This file is intended for fresh DB initialization.
-- Keep seed data in db-vm/init/02_seed.sql.
SET FOREIGN_KEY_CHECKS=0;

-- ai_events
CREATE TABLE IF NOT EXISTS `ai_events` (
  `event_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `camera_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `event_timestamp` datetime NOT NULL,
  `track_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `roi_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lane_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bbox_json` json DEFAULT NULL,
  `snapshot_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `video_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stream_url` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `raw_event_json` json NOT NULL,
  `received_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `idx_ai_events_camera_id` (`camera_id`),
  KEY `idx_ai_events_event_type` (`event_type`),
  KEY `idx_ai_events_severity` (`severity`),
  KEY `idx_ai_events_status` (`status`),
  KEY `idx_ai_events_event_timestamp` (`event_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- board_posts
CREATE TABLE IF NOT EXISTS `board_posts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `board_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `author_id` bigint DEFAULT NULL,
  `post_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_pinned` int NOT NULL,
  `view_count` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `author_id` (`author_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cctvs
CREATE TABLE IF NOT EXISTS `cctvs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cctv_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cctv_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stream_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `road_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direction` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_active` int NOT NULL,
  `installed_at` date DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  UNIQUE KEY `uq_cctvs_cctv_code` (`cctv_code`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- email_verifications
CREATE TABLE IF NOT EXISTS `email_verifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verification_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `verification_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_token` (`verification_token`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- external_api_logs
CREATE TABLE IF NOT EXISTS `external_api_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `service_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_json` json DEFAULT NULL,
  `response_status_code` int DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `latency_ms` int DEFAULT NULL,
  `is_success` int NOT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- identity_oauth_states
CREATE TABLE IF NOT EXISTS `identity_oauth_states` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `provider` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `state_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `state_hash` (`state_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- its_api_sources
CREATE TABLE IF NOT EXISTS `its_api_sources` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `source_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `base_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- signup_requests
CREATE TABLE IF NOT EXISTS `signup_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `request_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requested_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `request_memo` text COLLATE utf8mb4_unicode_ci,
  `reviewed_by` bigint DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- training_datasets
CREATE TABLE IF NOT EXISTS `training_datasets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `dataset_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataset_version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sample_count` int DEFAULT NULL,
  `positive_count` int DEFAULT NULL,
  `negative_count` int DEFAULT NULL,
  `label_schema_json` json DEFAULT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `login_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_email_verified` tinyint(1) NOT NULL,
  `identity_provider` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `identity_provider_user_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `identity_verified_at` datetime DEFAULT NULL,
  `approved_by` bigint DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `ix_users_login_id` (`login_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ai_models
CREATE TABLE IF NOT EXISTS `ai_models` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `task_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `owner_user_id` bigint DEFAULT NULL,
  `is_active` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `owner_user_id` (`owner_user_id`),
  CONSTRAINT `ai_models_ibfk_1` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- board_comments
CREATE TABLE IF NOT EXISTS `board_comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `parent_comment_id` bigint DEFAULT NULL,
  `author_id` bigint DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `comment_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `parent_comment_id` (`parent_comment_id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `board_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `board_posts` (`id`),
  CONSTRAINT `board_comments_ibfk_2` FOREIGN KEY (`parent_comment_id`) REFERENCES `board_comments` (`id`),
  CONSTRAINT `board_comments_ibfk_3` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- board_reactions
CREATE TABLE IF NOT EXISTS `board_reactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `reaction_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `board_reactions_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `board_posts` (`id`),
  CONSTRAINT `board_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bug_reports
CREATE TABLE IF NOT EXISTS `bug_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reporter_id` bigint DEFAULT NULL,
  `assigned_to` bigint DEFAULT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL',
  `severity` enum('BLOCKER','CRITICAL','MAJOR','MINOR','TRIVIAL') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MINOR',
  `priority` enum('HIGH','MEDIUM','LOW') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `status` enum('OPEN','TRIAGED','IN_PROGRESS','RESOLVED','CLOSED','REJECTED','DUPLICATE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `page_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `steps_to_reproduce` text COLLATE utf8mb4_unicode_ci,
  `expected_result` text COLLATE utf8mb4_unicode_ci,
  `actual_result` text COLLATE utf8mb4_unicode_ci,
  `browser` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_version` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_bug_reports_reporter` (`reporter_id`),
  KEY `fk_bug_reports_assigned_to` (`assigned_to`),
  KEY `idx_bug_reports_status` (`status`),
  KEY `idx_bug_reports_priority` (`priority`),
  KEY `idx_bug_reports_created_at` (`created_at`),
  CONSTRAINT `fk_bug_reports_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bug_reports_reporter` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cctv_rois
CREATE TABLE IF NOT EXISTS `cctv_rois` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cctv_id` bigint NOT NULL,
  `roi_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `roi_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `polygon_json` json NOT NULL,
  `is_active` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cctv_id` (`cctv_id`),
  CONSTRAINT `cctv_rois_ibfk_1` FOREIGN KEY (`cctv_id`) REFERENCES `cctvs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cctv_slots
CREATE TABLE IF NOT EXISTS `cctv_slots` (
  `slot_number` int NOT NULL AUTO_INCREMENT,
  `cctv_id` bigint DEFAULT NULL,
  `cctv_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `layout_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`slot_number`),
  KEY `fk_cctv_slots_cctv_id` (`cctv_id`),
  CONSTRAINT `fk_cctv_slots_cctv_id` FOREIGN KEY (`cctv_id`) REFERENCES `cctvs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cctv_status_logs
CREATE TABLE IF NOT EXISTS `cctv_status_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cctv_id` bigint NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci,
  `checked_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cctv_id` (`cctv_id`),
  CONSTRAINT `cctv_status_logs_ibfk_1` FOREIGN KEY (`cctv_id`) REFERENCES `cctvs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incident_reports
CREATE TABLE IF NOT EXISTS `incident_reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `upload_purpose` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_source_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `reporter_id` bigint NOT NULL,
  `cctv_id` bigint DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `risk_level` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `risk_score` int DEFAULT NULL,
  `reviewed_by` bigint DEFAULT NULL,
  `closed_by` bigint DEFAULT NULL,
  `reject_reason` text COLLATE utf8mb4_unicode_ci,
  `is_demo_data` int NOT NULL,
  `converted_incident_id` bigint DEFAULT NULL,
  `submitted_at` datetime NOT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reporter_id` (`reporter_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `closed_by` (`closed_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `incident_reports_ibfk_1` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`),
  CONSTRAINT `incident_reports_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `incident_reports_ibfk_3` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `incident_reports_ibfk_4` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- security_logs
CREATE TABLE IF NOT EXISTS `security_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `actor_user_id` bigint DEFAULT NULL,
  `action_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_id` bigint DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `log_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `actor_user_id` (`actor_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ai_model_versions
CREATE TABLE IF NOT EXISTS `ai_model_versions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `model_id` bigint NOT NULL,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataset_id` bigint DEFAULT NULL,
  `model_file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `config_json` json DEFAULT NULL,
  `metrics_json` json DEFAULT NULL,
  `is_deployed` int NOT NULL,
  `deployed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  KEY `dataset_id` (`dataset_id`),
  CONSTRAINT `ai_model_versions_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `ai_models` (`id`),
  CONSTRAINT `ai_model_versions_ibfk_2` FOREIGN KEY (`dataset_id`) REFERENCES `training_datasets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- board_attachments
CREATE TABLE IF NOT EXISTS `board_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `post_id` bigint DEFAULT NULL,
  `comment_id` bigint DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `download_count` int NOT NULL,
  `created_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `comment_id` (`comment_id`),
  KEY `uploaded_by` (`uploaded_by`),
  CONSTRAINT `board_attachments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `board_posts` (`id`),
  CONSTRAINT `board_attachments_ibfk_2` FOREIGN KEY (`comment_id`) REFERENCES `board_comments` (`id`),
  CONSTRAINT `board_attachments_ibfk_3` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- bug_report_attachments
CREATE TABLE IF NOT EXISTS `bug_report_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `bug_report_id` bigint NOT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_ext` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `checksum_sha256` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bug_report_attachments_report_id` (`bug_report_id`),
  KEY `idx_bug_report_attachments_uploaded_by` (`uploaded_by`),
  CONSTRAINT `fk_bug_report_attachments_report` FOREIGN KEY (`bug_report_id`) REFERENCES `bug_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bug_report_attachments_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incidents
CREATE TABLE IF NOT EXISTS `incidents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_id` bigint DEFAULT NULL,
  `cctv_id` bigint DEFAULT NULL,
  `incident_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `incident_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `risk_level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `confidence` decimal(5,4) DEFAULT NULL,
  `stopped_duration_seconds` int DEFAULT NULL,
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `detected_at` datetime NOT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_code` (`incident_code`),
  KEY `report_id` (`report_id`),
  CONSTRAINT `incidents_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- report_attachments
CREATE TABLE IF NOT EXISTS `report_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `file_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `stored_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scan_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_private` int NOT NULL,
  `download_count` int NOT NULL,
  `access_count` int NOT NULL,
  `duration_seconds` decimal(8,2) DEFAULT NULL,
  `fps` decimal(5,2) DEFAULT NULL,
  `resolution_width` int DEFAULT NULL,
  `resolution_height` int DEFAULT NULL,
  `exif_latitude` decimal(10,7) DEFAULT NULL,
  `exif_longitude` decimal(10,7) DEFAULT NULL,
  `recorded_at` datetime DEFAULT NULL,
  `uploaded_by` bigint NOT NULL,
  `uploaded_at` datetime NOT NULL,
  `deleted_by` bigint DEFAULT NULL,
  `delete_reason` text COLLATE utf8mb4_unicode_ci,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `deleted_by` (`deleted_by`),
  CONSTRAINT `report_attachments_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`),
  CONSTRAINT `report_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`),
  CONSTRAINT `report_attachments_ibfk_3` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- report_locations
CREATE TABLE IF NOT EXISTS `report_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `cctv_id` bigint DEFAULT NULL,
  `location_source` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `road_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `jibun_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `place_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `road_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tunnel_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direction` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lane_info` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_provider` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_raw` json DEFAULT NULL,
  `confidence` decimal(4,3) DEFAULT NULL,
  `is_location_confirmed` int NOT NULL,
  `confirmed_by` bigint DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `confirmed_by` (`confirmed_by`),
  CONSTRAINT `report_locations_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`),
  CONSTRAINT `report_locations_ibfk_2` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- report_memos
CREATE TABLE IF NOT EXISTS `report_memos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `author_id` bigint NOT NULL,
  `memo_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `author_id` (`author_id`),
  CONSTRAINT `report_memos_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`),
  CONSTRAINT `report_memos_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- report_status_histories
CREATE TABLE IF NOT EXISTS `report_status_histories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `previous_status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` bigint NOT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `report_status_histories_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`),
  CONSTRAINT `report_status_histories_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- chat_rooms
CREATE TABLE IF NOT EXISTS `chat_rooms` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint DEFAULT NULL,
  `room_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `closed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `chat_rooms_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incident_memos
CREATE TABLE IF NOT EXISTS `incident_memos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `author_user_id` bigint DEFAULT NULL,
  `memo_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `memo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `author_user_id` (`author_user_id`),
  CONSTRAINT `incident_memos_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `incident_memos_ibfk_2` FOREIGN KEY (`author_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incident_status_histories
CREATE TABLE IF NOT EXISTS `incident_status_histories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `previous_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` bigint DEFAULT NULL,
  `change_reason` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `changed_by` (`changed_by`),
  CONSTRAINT `incident_status_histories_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `incident_status_histories_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- its_traffic_snapshots
CREATE TABLE IF NOT EXISTS `its_traffic_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint DEFAULT NULL,
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `road_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direction` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `speed_avg` decimal(8,2) DEFAULT NULL,
  `traffic_volume` int DEFAULT NULL,
  `congestion_level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `raw_response_json` json DEFAULT NULL,
  `observed_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  CONSTRAINT `its_traffic_snapshots_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- its_weather_snapshots
CREATE TABLE IF NOT EXISTS `its_weather_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint DEFAULT NULL,
  `provider` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `precipitation` decimal(8,2) DEFAULT NULL,
  `wind_speed` decimal(8,2) DEFAULT NULL,
  `visibility` decimal(8,2) DEFAULT NULL,
  `weather_condition` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_response_json` json DEFAULT NULL,
  `observed_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  CONSTRAINT `its_weather_snapshots_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `incident_id` bigint DEFAULT NULL,
  `notification_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` int NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `incident_id` (`incident_id`),
  CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- realtime_events
CREATE TABLE IF NOT EXISTS `realtime_events` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `event_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_user_id` bigint unsigned DEFAULT NULL,
  `target_role` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_room` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_resource_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_resource_id` bigint unsigned DEFAULT NULL,
  `incident_id` bigint unsigned DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `send_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_realtime_events_event_type` (`event_type`),
  KEY `idx_realtime_events_event_name` (`event_name`),
  KEY `idx_realtime_events_target_user_id` (`target_user_id`),
  KEY `idx_realtime_events_target_role` (`target_role`),
  KEY `idx_realtime_events_target_room` (`target_room`),
  KEY `idx_realtime_events_incident_id` (`incident_id`),
  KEY `idx_realtime_events_send_status` (`send_status`),
  KEY `idx_realtime_events_created_at` (`created_at`),
  KEY `idx_realtime_events_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- report_analysis_jobs
CREATE TABLE IF NOT EXISTS `report_analysis_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `attachment_id` bigint NOT NULL,
  `job_status` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `analysis_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ai_engine_type` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `primary_model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_model_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secondary_model_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_strategy` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confidence_threshold` decimal(4,3) NOT NULL,
  `lane_stop_threshold` int NOT NULL,
  `shoulder_stop_threshold` int NOT NULL,
  `movement_threshold_px` int NOT NULL,
  `sample_fps` decimal(5,2) DEFAULT NULL,
  `total_frames` int DEFAULT NULL,
  `processed_frames` int DEFAULT NULL,
  `progress_percent` decimal(5,2) DEFAULT NULL,
  `retry_count` int NOT NULL,
  `latency_ms` int DEFAULT NULL,
  `result_summary` json DEFAULT NULL,
  `raw_result_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_incident_id` bigint DEFAULT NULL,
  `requested_by` bigint NOT NULL,
  `requested_at` datetime NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `failed_reason_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `report_id` (`report_id`),
  KEY `attachment_id` (`attachment_id`),
  KEY `requested_by` (`requested_by`),
  CONSTRAINT `report_analysis_jobs_ibfk_1` FOREIGN KEY (`report_id`) REFERENCES `incident_reports` (`id`),
  CONSTRAINT `report_analysis_jobs_ibfk_2` FOREIGN KEY (`attachment_id`) REFERENCES `report_attachments` (`id`),
  CONSTRAINT `report_analysis_jobs_ibfk_3` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- training_jobs
CREATE TABLE IF NOT EXISTS `training_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `model_id` bigint NOT NULL,
  `dataset_id` bigint DEFAULT NULL,
  `base_model_version_id` bigint DEFAULT NULL,
  `output_model_version_id` bigint DEFAULT NULL,
  `requested_by` bigint DEFAULT NULL,
  `job_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `hyperparameter_json` json DEFAULT NULL,
  `result_metrics_json` json DEFAULT NULL,
  `log_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `started_at` datetime DEFAULT NULL,
  `finished_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `model_id` (`model_id`),
  KEY `dataset_id` (`dataset_id`),
  KEY `base_model_version_id` (`base_model_version_id`),
  KEY `output_model_version_id` (`output_model_version_id`),
  KEY `requested_by` (`requested_by`),
  CONSTRAINT `training_jobs_ibfk_1` FOREIGN KEY (`model_id`) REFERENCES `ai_models` (`id`),
  CONSTRAINT `training_jobs_ibfk_2` FOREIGN KEY (`dataset_id`) REFERENCES `training_datasets` (`id`),
  CONSTRAINT `training_jobs_ibfk_3` FOREIGN KEY (`base_model_version_id`) REFERENCES `ai_model_versions` (`id`),
  CONSTRAINT `training_jobs_ibfk_4` FOREIGN KEY (`output_model_version_id`) REFERENCES `ai_model_versions` (`id`),
  CONSTRAINT `training_jobs_ibfk_5` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- chat_messages
CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `incident_id` bigint DEFAULT NULL,
  `sender_user_id` bigint DEFAULT NULL,
  `message_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_id` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `incident_id` (`incident_id`),
  KEY `sender_user_id` (`sender_user_id`),
  KEY `attachment_id` (`attachment_id`),
  CONSTRAINT `chat_messages_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`),
  CONSTRAINT `chat_messages_ibfk_2` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `chat_messages_ibfk_4` FOREIGN KEY (`attachment_id`) REFERENCES `board_attachments` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- chat_room_members
CREATE TABLE IF NOT EXISTS `chat_room_members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `member_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `joined_at` datetime NOT NULL,
  `left_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_room_members_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `chat_rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- detection_logs
CREATE TABLE IF NOT EXISTS `detection_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `report_analysis_job_id` bigint DEFAULT NULL,
  `model_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detected_class` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `confidence` decimal(5,4) DEFAULT NULL,
  `bbox_json` json DEFAULT NULL,
  `roi_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `movement_delta_px` decimal(10,3) DEFAULT NULL,
  `stopped_duration_seconds` int DEFAULT NULL,
  `frame_timestamp_ms` bigint DEFAULT NULL,
  `raw_result_json` json DEFAULT NULL,
  `detected_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `report_analysis_job_id` (`report_analysis_job_id`),
  CONSTRAINT `detection_logs_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `detection_logs_ibfk_2` FOREIGN KEY (`report_analysis_job_id`) REFERENCES `report_analysis_jobs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- its_risk_scores
CREATE TABLE IF NOT EXISTS `its_risk_scores` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `weather_snapshot_id` bigint DEFAULT NULL,
  `traffic_snapshot_id` bigint DEFAULT NULL,
  `risk_score` decimal(6,3) NOT NULL,
  `risk_level` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `score_detail_json` json DEFAULT NULL,
  `calculated_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `weather_snapshot_id` (`weather_snapshot_id`),
  KEY `traffic_snapshot_id` (`traffic_snapshot_id`),
  CONSTRAINT `its_risk_scores_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `its_risk_scores_ibfk_2` FOREIGN KEY (`weather_snapshot_id`) REFERENCES `its_weather_snapshots` (`id`),
  CONSTRAINT `its_risk_scores_ibfk_3` FOREIGN KEY (`traffic_snapshot_id`) REFERENCES `its_traffic_snapshots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- notification_deliveries
CREATE TABLE IF NOT EXISTS `notification_deliveries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notification_id` bigint NOT NULL,
  `user_id` bigint DEFAULT NULL,
  `delivery_channel` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `notification_id` (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notification_deliveries_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`),
  CONSTRAINT `notification_deliveries_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- risk_context_snapshots
CREATE TABLE IF NOT EXISTS `risk_context_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `weather_snapshot_id` bigint DEFAULT NULL,
  `traffic_snapshot_id` bigint DEFAULT NULL,
  `context_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `weather_snapshot_id` (`weather_snapshot_id`),
  KEY `traffic_snapshot_id` (`traffic_snapshot_id`),
  CONSTRAINT `risk_context_snapshots_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `risk_context_snapshots_ibfk_2` FOREIGN KEY (`weather_snapshot_id`) REFERENCES `its_weather_snapshots` (`id`),
  CONSTRAINT `risk_context_snapshots_ibfk_3` FOREIGN KEY (`traffic_snapshot_id`) REFERENCES `its_traffic_snapshots` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- chat_message_reads
CREATE TABLE IF NOT EXISTS `chat_message_reads` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `message_id` bigint NOT NULL,
  `user_id` bigint NOT NULL,
  `read_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `message_id` (`message_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `chat_message_reads_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `chat_messages` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- incident_snapshots
CREATE TABLE IF NOT EXISTS `incident_snapshots` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `detection_log_id` bigint DEFAULT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_path` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bbox_json` json DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `detection_log_id` (`detection_log_id`),
  CONSTRAINT `incident_snapshots_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `incident_snapshots_ibfk_2` FOREIGN KEY (`detection_log_id`) REFERENCES `detection_logs` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- risk_calculation_logs
CREATE TABLE IF NOT EXISTS `risk_calculation_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `incident_id` bigint NOT NULL,
  `risk_score_id` bigint DEFAULT NULL,
  `calculation_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `input_json` json DEFAULT NULL,
  `result_json` json DEFAULT NULL,
  `calculated_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `risk_score_id` (`risk_score_id`),
  CONSTRAINT `risk_calculation_logs_ibfk_1` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `risk_calculation_logs_ibfk_2` FOREIGN KEY (`risk_score_id`) REFERENCES `its_risk_scores` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
