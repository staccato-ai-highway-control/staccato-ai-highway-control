-- STACCATO MySQL 8.0 Core Schema
-- Core tables for auth, CCTV, incident, detection, and notification domains.

CREATE DATABASE IF NOT EXISTS staccato
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE staccato;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    role ENUM(
        'SUPER_ADMIN',
        'AUTH_ADMIN',
        'CONTROL_ADMIN',
        'DISPATCH_ADMIN',
        'MAINTENANCE_ADMIN',
        'VIEWER'
    ) NOT NULL DEFAULT 'VIEWER',
    account_status ENUM(
        'PENDING',
        'ACTIVE',
        'REJECTED',
        'SUSPENDED',
        'DELETED'
    ) NOT NULL DEFAULT 'PENDING',
    is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
    approved_by BIGINT NULL,
    approved_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS signup_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    request_status ENUM(
        'REQUESTED',
        'APPROVED',
        'REJECTED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'REQUESTED',
    requested_role ENUM(
        'SUPER_ADMIN',
        'AUTH_ADMIN',
        'CONTROL_ADMIN',
        'DISPATCH_ADMIN',
        'MAINTENANCE_ADMIN',
        'VIEWER'
    ) NOT NULL DEFAULT 'VIEWER',
    request_memo TEXT NULL,
    reviewed_by BIGINT NULL,
    reviewed_at DATETIME NULL,
    reject_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_signup_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_signup_requests_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    verification_status ENUM(
        'PENDING',
        'VERIFIED',
        'EXPIRED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_email_verifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id BIGINT NULL,
    action_type VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NULL,
    target_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    log_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_security_logs_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cctvs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cctv_code VARCHAR(50) NOT NULL UNIQUE,
    cctv_name VARCHAR(100) NOT NULL,
    stream_url VARCHAR(500) NULL,
    location_name VARCHAR(255) NULL,
    road_name VARCHAR(100) NULL,
    direction VARCHAR(50) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    installed_at DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cctv_rois (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    cctv_id BIGINT NOT NULL,
    roi_type ENUM(
        'DRIVING_LANE',
        'SHOULDER',
        'EMERGENCY_BAY',
        'IGNORE_AREA'
    ) NOT NULL,
    roi_name VARCHAR(100) NOT NULL,
    polygon_json JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_cctv_rois_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incidents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_code VARCHAR(50) NOT NULL UNIQUE,
    cctv_id BIGINT NULL,
    incident_type ENUM(
        'LANE_STOP',
        'SHOULDER_STOP'
    ) NOT NULL,
    incident_status ENUM(
        'DETECTED',
        'CONFIRMED',
        'FALSE_POSITIVE',
        'DISPATCHED',
        'RESOLVED',
        'CLOSED'
    ) NOT NULL DEFAULT 'DETECTED',
    risk_level ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NOT NULL DEFAULT 'MEDIUM',
    confidence DECIMAL(5, 4) NULL,
    stopped_duration_seconds INT NULL,
    detected_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,
    location_name VARCHAR(255) NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_incidents_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detection_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NULL,
    cctv_id BIGINT NULL,
    model_name VARCHAR(100) NULL,
    model_version VARCHAR(50) NULL,
    detected_class VARCHAR(100) NULL,
    confidence DECIMAL(5, 4) NULL,
    bbox_json JSON NULL,
    roi_type ENUM(
        'DRIVING_LANE',
        'SHOULDER',
        'EMERGENCY_BAY',
        'IGNORE_AREA',
        'UNKNOWN'
    ) NOT NULL DEFAULT 'UNKNOWN',
    movement_delta_px DECIMAL(10, 3) NULL,
    stopped_duration_seconds INT NULL,
    frame_timestamp_ms BIGINT NULL,
    raw_result_json JSON NULL,
    detected_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_detection_logs_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_detection_logs_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    detection_log_id BIGINT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NULL,
    bbox_json JSON NULL,
    captured_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_snapshots_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_incident_snapshots_detection_log
        FOREIGN KEY (detection_log_id) REFERENCES detection_logs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NULL,
    incident_id BIGINT NULL,
    notification_type ENUM(
        'AI_DETECTION',
        'INCIDENT_STATUS',
        'SYSTEM',
        'REPORT',
        'MLOPS'
    ) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NOT NULL DEFAULT 'MEDIUM',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_notifications_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;