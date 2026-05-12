CREATE TABLE IF NOT EXISTS incidents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_code VARCHAR(50) NOT NULL,

    report_id BIGINT NULL,
    cctv_id BIGINT NULL,

    incident_type VARCHAR(50) NOT NULL,
    incident_status VARCHAR(50) NOT NULL DEFAULT 'DETECTED',
    risk_level VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',

    confidence DECIMAL(5,4) NULL,
    stopped_duration_seconds INT NULL,

    location_name VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,

    detected_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_incidents_incident_code (incident_code),
    KEY idx_incidents_report_id (report_id),
    KEY idx_incidents_type_status (incident_type, incident_status),
    KEY idx_incidents_detected_at (detected_at),
    KEY idx_incidents_risk_level (risk_level),

    CONSTRAINT fk_incidents_report_id
        FOREIGN KEY (report_id)
        REFERENCES incident_reports(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS detection_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,

    incident_id BIGINT NOT NULL,
    report_analysis_job_id BIGINT NULL,

    model_name VARCHAR(100) NULL,
    model_version VARCHAR(50) NULL,

    detected_class VARCHAR(100) NULL,
    confidence DECIMAL(5,4) NULL,

    bbox_json JSON NULL,
    roi_type VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',

    movement_delta_px DECIMAL(10,3) NULL,
    stopped_duration_seconds INT NULL,
    frame_timestamp_ms BIGINT NULL,

    raw_result_json JSON NULL,

    detected_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_detection_logs_incident_id (incident_id),
    KEY idx_detection_logs_job_id (report_analysis_job_id),
    KEY idx_detection_logs_detected_at (detected_at),
    KEY idx_detection_logs_roi_type (roi_type),

    CONSTRAINT fk_detection_logs_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_detection_logs_report_analysis_job_id
        FOREIGN KEY (report_analysis_job_id)
        REFERENCES report_analysis_jobs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,

    incident_id BIGINT NOT NULL,
    detection_log_id BIGINT NULL,

    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500) NULL,
    bbox_json JSON NULL,

    captured_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_incident_snapshots_incident_id (incident_id),
    KEY idx_incident_snapshots_detection_log_id (detection_log_id),
    KEY idx_incident_snapshots_captured_at (captured_at),

    CONSTRAINT fk_incident_snapshots_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_incident_snapshots_detection_log_id
        FOREIGN KEY (detection_log_id)
        REFERENCES detection_logs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_reports (
    id BIGINT NOT NULL AUTO_INCREMENT,

    incident_id BIGINT NOT NULL,
    generated_by BIGINT NULL,

    report_type VARCHAR(50) NOT NULL DEFAULT 'INCIDENT_SUMMARY',
    report_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',

    title VARCHAR(200) NOT NULL,
    prompt_text TEXT NULL,
    report_content MEDIUMTEXT NULL,

    model_name VARCHAR(100) NULL,
    token_usage_json JSON NULL,
    llm_response_json JSON NULL,

    error_message TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    confirmed_at DATETIME NULL,

    PRIMARY KEY (id),
    KEY idx_llm_reports_incident_id (incident_id),
    KEY idx_llm_reports_generated_by (generated_by),
    KEY idx_llm_reports_status (report_status),
    KEY idx_llm_reports_created_at (created_at),

    CONSTRAINT fk_llm_reports_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_llm_reports_generated_by
        FOREIGN KEY (generated_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
