CREATE TABLE IF NOT EXISTS cctvs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cctv_code VARCHAR(50) NOT NULL,
    cctv_name VARCHAR(100) NOT NULL,
    stream_url VARCHAR(500) NULL,
    location_name VARCHAR(255) NULL,
    road_name VARCHAR(100) NULL,
    direction VARCHAR(50) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    installed_at DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_cctvs_cctv_code (cctv_code),
    KEY idx_cctvs_active (is_active),
    KEY idx_cctvs_road_direction (road_name, direction)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cctv_rois (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cctv_id BIGINT NOT NULL,
    roi_type VARCHAR(50) NOT NULL,
    roi_name VARCHAR(100) NOT NULL,
    polygon_json JSON NOT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cctv_rois_cctv_id (cctv_id),
    KEY idx_cctv_rois_type_active (roi_type, is_active),
    CONSTRAINT fk_cctv_rois_cctv_id
        FOREIGN KEY (cctv_id)
        REFERENCES cctvs(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cctv_status_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cctv_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    message TEXT NULL,
    checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cctv_status_logs_cctv_checked (cctv_id, checked_at),
    KEY idx_cctv_status_logs_status (status),
    CONSTRAINT fk_cctv_status_logs_cctv_id
        FOREIGN KEY (cctv_id)
        REFERENCES cctvs(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_status_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT NULL,
    change_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_incident_status_histories_incident_id (incident_id),
    KEY idx_incident_status_histories_changed_by (changed_by),
    CONSTRAINT fk_incident_status_histories_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_incident_status_histories_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS incident_memos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    author_user_id BIGINT NULL,
    memo_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    memo TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_incident_memos_incident_id (incident_id),
    KEY idx_incident_memos_author_user_id (author_user_id),
    CONSTRAINT fk_incident_memos_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_incident_memos_author_user_id
        FOREIGN KEY (author_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_report_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    version_no INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    report_content MEDIUMTEXT NULL,
    edited_by BIGINT NULL,
    change_summary TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_llm_report_versions_report_version (report_id, version_no),
    KEY idx_llm_report_versions_report_id (report_id),
    KEY idx_llm_report_versions_edited_by (edited_by),
    CONSTRAINT fk_llm_report_versions_report_id
        FOREIGN KEY (report_id)
        REFERENCES llm_reports(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_llm_report_versions_edited_by
        FOREIGN KEY (edited_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS llm_report_status_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    previous_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by BIGINT NULL,
    change_reason TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_llm_report_status_histories_report_id (report_id),
    KEY idx_llm_report_status_histories_changed_by (changed_by),
    CONSTRAINT fk_llm_report_status_histories_report_id
        FOREIGN KEY (report_id)
        REFERENCES llm_reports(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_llm_report_status_histories_changed_by
        FOREIGN KEY (changed_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_api_sources (
    id BIGINT NOT NULL AUTO_INCREMENT,
    source_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    base_url VARCHAR(500) NULL,
    description TEXT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_its_api_sources_source_name (source_name),
    KEY idx_its_api_sources_type_active (source_type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_context_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    weather_snapshot_id BIGINT NULL,
    traffic_snapshot_id BIGINT NULL,
    context_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_risk_context_snapshots_incident_id (incident_id),
    KEY idx_risk_context_snapshots_weather_id (weather_snapshot_id),
    KEY idx_risk_context_snapshots_traffic_id (traffic_snapshot_id),
    CONSTRAINT fk_risk_context_snapshots_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_risk_context_snapshots_weather_id
        FOREIGN KEY (weather_snapshot_id)
        REFERENCES its_weather_snapshots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_risk_context_snapshots_traffic_id
        FOREIGN KEY (traffic_snapshot_id)
        REFERENCES its_traffic_snapshots(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS risk_calculation_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    risk_score_id BIGINT NULL,
    calculation_type VARCHAR(50) NOT NULL DEFAULT 'MVP_RULE',
    input_json JSON NULL,
    result_json JSON NULL,
    calculated_by VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_risk_calculation_logs_incident_id (incident_id),
    KEY idx_risk_calculation_logs_risk_score_id (risk_score_id),
    CONSTRAINT fk_risk_calculation_logs_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_risk_calculation_logs_risk_score_id
        FOREIGN KEY (risk_score_id)
        REFERENCES its_risk_scores(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS board_reactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    reaction_type VARCHAR(50) NOT NULL DEFAULT 'LIKE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_board_reactions_post_user_type (post_id, user_id, reaction_type),
    KEY idx_board_reactions_user_id (user_id),
    CONSTRAINT fk_board_reactions_post_id
        FOREIGN KEY (post_id)
        REFERENCES board_posts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_board_reactions_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_room_members (
    id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    member_role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chat_room_members_room_user (room_id, user_id),
    KEY idx_chat_room_members_user_id (user_id),
    CONSTRAINT fk_chat_room_members_room_id
        FOREIGN KEY (room_id)
        REFERENCES chat_rooms(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chat_room_members_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_models (
    id BIGINT NOT NULL AUTO_INCREMENT,
    model_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL DEFAULT 'STOPPED_VEHICLE_DETECTION',
    description TEXT NULL,
    owner_user_id BIGINT NULL,
    is_active TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_models_model_name (model_name),
    KEY idx_ai_models_task_active (task_type, is_active),
    CONSTRAINT fk_ai_models_owner_user_id
        FOREIGN KEY (owner_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_datasets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    dataset_name VARCHAR(100) NOT NULL,
    dataset_version VARCHAR(50) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    sample_count INT NULL,
    positive_count INT NULL,
    negative_count INT NULL,
    label_schema_json JSON NULL,
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_training_datasets_name_version (dataset_name, dataset_version),
    KEY idx_training_datasets_created_by (created_by),
    CONSTRAINT fk_training_datasets_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ai_model_versions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    version VARCHAR(50) NOT NULL,
    dataset_id BIGINT NULL,
    model_file_path VARCHAR(500) NOT NULL,
    config_json JSON NULL,
    metrics_json JSON NULL,
    is_deployed TINYINT NOT NULL DEFAULT 0,
    deployed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ai_model_versions_model_version (model_id, version),
    KEY idx_ai_model_versions_dataset_id (dataset_id),
    KEY idx_ai_model_versions_deployed (is_deployed),
    CONSTRAINT fk_ai_model_versions_model_id
        FOREIGN KEY (model_id)
        REFERENCES ai_models(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ai_model_versions_dataset_id
        FOREIGN KEY (dataset_id)
        REFERENCES training_datasets(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS training_jobs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    model_id BIGINT NOT NULL,
    dataset_id BIGINT NULL,
    base_model_version_id BIGINT NULL,
    output_model_version_id BIGINT NULL,
    requested_by BIGINT NULL,
    job_status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    hyperparameter_json JSON NULL,
    result_metrics_json JSON NULL,
    log_path VARCHAR(500) NULL,
    error_message TEXT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_training_jobs_model_id (model_id),
    KEY idx_training_jobs_dataset_id (dataset_id),
    KEY idx_training_jobs_status (job_status),
    CONSTRAINT fk_training_jobs_model_id
        FOREIGN KEY (model_id)
        REFERENCES ai_models(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_training_jobs_dataset_id
        FOREIGN KEY (dataset_id)
        REFERENCES training_datasets(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_base_model_version_id
        FOREIGN KEY (base_model_version_id)
        REFERENCES ai_model_versions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_output_model_version_id
        FOREIGN KEY (output_model_version_id)
        REFERENCES ai_model_versions(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_training_jobs_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
