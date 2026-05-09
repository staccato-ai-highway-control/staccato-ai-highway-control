-- STACCATO MVP Schema Extension
-- Additional tables for incident history, uploads, reports, ITS, notification delivery, and MLOps metadata.

USE staccato;

CREATE TABLE IF NOT EXISTS incident_status_histories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    previous_status ENUM(
        'DETECTED',
        'CONFIRMED',
        'FALSE_POSITIVE',
        'DISPATCHED',
        'RESOLVED',
        'CLOSED'
    ) NULL,
    new_status ENUM(
        'DETECTED',
        'CONFIRMED',
        'FALSE_POSITIVE',
        'DISPATCHED',
        'RESOLVED',
        'CLOSED'
    ) NOT NULL,
    changed_by BIGINT NULL,
    change_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_status_histories_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_incident_status_histories_user
        FOREIGN KEY (changed_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_memos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    author_user_id BIGINT NULL,
    memo_type ENUM(
        'GENERAL',
        'DISPATCH',
        'MAINTENANCE',
        'REPORT',
        'SYSTEM'
    ) NOT NULL DEFAULT 'GENERAL',
    memo TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_incident_memos_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_incident_memos_author
        FOREIGN KEY (author_user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_uploads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uploaded_by BIGINT NULL,
    incident_id BIGINT NULL,
    upload_type ENUM(
        'IMAGE',
        'VIDEO',
        'ZIP',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',
    upload_status ENUM(
        'UPLOADED',
        'ANALYSIS_REQUESTED',
        'ANALYZED',
        'FAILED',
        'DELETED'
    ) NOT NULL DEFAULT 'UPLOADED',
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    CONSTRAINT fk_report_uploads_user
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_report_uploads_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS report_attachments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NULL,
    upload_id BIGINT NULL,
    attachment_type ENUM(
        'SNAPSHOT',
        'VIDEO',
        'THUMBNAIL',
        'REPORT_FILE',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_report_attachments_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_report_attachments_upload
        FOREIGN KEY (upload_id) REFERENCES report_uploads(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analysis_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    requested_by BIGINT NULL,
    incident_id BIGINT NULL,
    cctv_id BIGINT NULL,
    upload_id BIGINT NULL,
    job_type ENUM(
        'CCTV_STREAM_ANALYSIS',
        'UPLOAD_IMAGE_ANALYSIS',
        'UPLOAD_VIDEO_ANALYSIS',
        'REANALYSIS'
    ) NOT NULL,
    job_status ENUM(
        'QUEUED',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'QUEUED',
    request_payload_json JSON NULL,
    result_json JSON NULL,
    error_message TEXT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_jobs_user
        FOREIGN KEY (requested_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_analysis_jobs_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_analysis_jobs_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_analysis_jobs_upload
        FOREIGN KEY (upload_id) REFERENCES report_uploads(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NULL,
    generated_by BIGINT NULL,
    report_type ENUM(
        'INCIDENT_SUMMARY',
        'DISPATCH_REPORT',
        'DAILY_REPORT',
        'ANALYSIS_REPORT'
    ) NOT NULL DEFAULT 'INCIDENT_SUMMARY',
    report_status ENUM(
        'DRAFT',
        'GENERATED',
        'FAILED',
        'CONFIRMED'
    ) NOT NULL DEFAULT 'DRAFT',
    title VARCHAR(200) NOT NULL,
    prompt_text TEXT NULL,
    report_content MEDIUMTEXT NULL,
    model_name VARCHAR(100) NULL,
    token_usage_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_llm_reports_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_llm_reports_user
        FOREIGN KEY (generated_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_weather_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NULL,
    cctv_id BIGINT NULL,
    provider VARCHAR(100) NULL,
    location_name VARCHAR(255) NULL,
    temperature DECIMAL(5, 2) NULL,
    precipitation DECIMAL(8, 2) NULL,
    wind_speed DECIMAL(8, 2) NULL,
    visibility DECIMAL(8, 2) NULL,
    weather_condition VARCHAR(100) NULL,
    raw_response_json JSON NULL,
    observed_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_its_weather_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_its_weather_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_traffic_snapshots (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NULL,
    cctv_id BIGINT NULL,
    provider VARCHAR(100) NULL,
    road_name VARCHAR(100) NULL,
    direction VARCHAR(50) NULL,
    speed_avg DECIMAL(8, 2) NULL,
    traffic_volume INT NULL,
    congestion_level ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'UNKNOWN'
    ) NOT NULL DEFAULT 'UNKNOWN',
    raw_response_json JSON NULL,
    observed_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_its_traffic_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_its_traffic_cctv
        FOREIGN KEY (cctv_id) REFERENCES cctvs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_risk_scores (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    incident_id BIGINT NOT NULL,
    weather_snapshot_id BIGINT NULL,
    traffic_snapshot_id BIGINT NULL,
    risk_score DECIMAL(6, 3) NOT NULL,
    risk_level ENUM(
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    ) NOT NULL,
    score_detail_json JSON NULL,
    calculated_at DATETIME NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_its_risk_scores_incident
        FOREIGN KEY (incident_id) REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_its_risk_scores_weather
        FOREIGN KEY (weather_snapshot_id) REFERENCES its_weather_snapshots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_its_risk_scores_traffic
        FOREIGN KEY (traffic_snapshot_id) REFERENCES its_traffic_snapshots(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    notification_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    delivery_channel ENUM(
        'WEB_SOCKET',
        'WEB',
        'EMAIL',
        'SMS',
        'PUSH'
    ) NOT NULL DEFAULT 'WEB_SOCKET',
    delivery_status ENUM(
        'PENDING',
        'SENT',
        'FAILED',
        'READ'
    ) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    delivered_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_deliveries_notification
        FOREIGN KEY (notification_id) REFERENCES notifications(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_deliveries_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS external_api_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(20) NOT NULL,
    request_json JSON NULL,
    response_status_code INT NULL,
    response_json JSON NULL,
    latency_ms INT NULL,
    is_success TINYINT(1) NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_models (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    task_type ENUM(
        'OBJECT_DETECTION',
        'STOPPED_VEHICLE_DETECTION',
        'ROI_CLASSIFICATION',
        'RISK_CLASSIFICATION'
    ) NOT NULL DEFAULT 'STOPPED_VEHICLE_DETECTION',
    description TEXT NULL,
    owner_user_id BIGINT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_models_owner
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT uk_ai_models_name UNIQUE (model_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_datasets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    dataset_name VARCHAR(100) NOT NULL,
    dataset_version VARCHAR(50) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    sample_count INT NULL,
    positive_count INT NULL,
    negative_count INT NULL,
    label_schema_json JSON NULL,
    created_by BIGINT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_training_datasets_user
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT uk_training_dataset_version UNIQUE (dataset_name, dataset_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_model_versions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT NOT NULL,
    version VARCHAR(50) NOT NULL,
    dataset_id BIGINT NULL,
    model_file_path VARCHAR(500) NOT NULL,
    config_json JSON NULL,
    metrics_json JSON NULL,
    is_deployed TINYINT(1) NOT NULL DEFAULT 0,
    deployed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_model_versions_model
        FOREIGN KEY (model_id) REFERENCES ai_models(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ai_model_versions_dataset
        FOREIGN KEY (dataset_id) REFERENCES training_datasets(id)
        ON DELETE SET NULL,
    CONSTRAINT uk_ai_model_version UNIQUE (model_id, version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_jobs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    model_id BIGINT NOT NULL,
    dataset_id BIGINT NULL,
    base_model_version_id BIGINT NULL,
    output_model_version_id BIGINT NULL,
    requested_by BIGINT NULL,
    job_status ENUM(
        'QUEUED',
        'RUNNING',
        'SUCCESS',
        'FAILED',
        'CANCELLED'
    ) NOT NULL DEFAULT 'QUEUED',
    hyperparameter_json JSON NULL,
    result_metrics_json JSON NULL,
    log_path VARCHAR(500) NULL,
    error_message TEXT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_training_jobs_model
        FOREIGN KEY (model_id) REFERENCES ai_models(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_training_jobs_dataset
        FOREIGN KEY (dataset_id) REFERENCES training_datasets(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_base_version
        FOREIGN KEY (base_model_version_id) REFERENCES ai_model_versions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_output_version
        FOREIGN KEY (output_model_version_id) REFERENCES ai_model_versions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_user
        FOREIGN KEY (requested_by) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;