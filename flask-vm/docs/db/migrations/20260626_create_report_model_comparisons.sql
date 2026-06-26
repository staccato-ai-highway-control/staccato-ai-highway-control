-- 신고 첨부파일 1건을 최대 3개 AI 모델로 비교 분석하기 위한 전용 테이블입니다.
-- 기존 report_analysis_jobs 및 기존 신고 AI 분석 흐름은 변경하지 않습니다.

CREATE TABLE IF NOT EXISTS report_model_comparison_batches (
    id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    attachment_id BIGINT NOT NULL,
    requested_by BIGINT NULL,

    batch_status VARCHAR(30) NOT NULL,
    selected_model_count INT NOT NULL,

    created_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    updated_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_report_model_comparison_batches_report_id (report_id),
    INDEX idx_report_model_comparison_batches_attachment_id (attachment_id),
    INDEX idx_report_model_comparison_batches_status (batch_status),

    CONSTRAINT fk_report_model_comparison_batches_report
        FOREIGN KEY (report_id)
        REFERENCES incident_reports(id),

    CONSTRAINT fk_report_model_comparison_batches_attachment
        FOREIGN KEY (attachment_id)
        REFERENCES report_attachments(id),

    CONSTRAINT fk_report_model_comparison_batches_requested_by
        FOREIGN KEY (requested_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS report_model_comparison_runs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    batch_id BIGINT NOT NULL,

    model_id VARCHAR(100) NOT NULL,
    model_name VARCHAR(100) NULL,
    model_version VARCHAR(100) NULL,

    run_status VARCHAR(30) NOT NULL,
    request_order INT NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,

    total_frames INT NULL,
    processed_frames INT NULL,
    total_elapsed_ms INT NULL,
    inference_ms INT NULL,
    processed_fps DECIMAL(10,2) NULL,

    detection_count INT NULL,
    avg_confidence DECIMAL(6,5) NULL,
    max_confidence DECIMAL(6,5) NULL,
    class_summary JSON NULL,

    result_summary JSON NULL,
    annotated_media_url VARCHAR(500) NULL,

    error_code VARCHAR(100) NULL,
    error_message TEXT NULL,

    created_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    updated_at DATETIME NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_report_model_comparison_runs_batch_model (
        batch_id,
        model_id
    ),

    UNIQUE KEY uq_report_model_comparison_runs_batch_order (
        batch_id,
        request_order
    ),

    INDEX idx_report_model_comparison_runs_batch_id (batch_id),
    INDEX idx_report_model_comparison_runs_status (run_status),

    CONSTRAINT fk_report_model_comparison_runs_batch
        FOREIGN KEY (batch_id)
        REFERENCES report_model_comparison_batches(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
