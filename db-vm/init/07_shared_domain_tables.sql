CREATE TABLE IF NOT EXISTS board_posts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    board_type VARCHAR(50) NOT NULL DEFAULT 'NOTICE',
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT NOT NULL,
    author_id BIGINT NULL,
    post_status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
    is_pinned TINYINT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_board_posts_type_status (board_type, post_status),
    KEY idx_board_posts_author_id (author_id),
    KEY idx_board_posts_created_at (created_at),
    CONSTRAINT fk_board_posts_author_id
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS board_comments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    author_id BIGINT NULL,
    content TEXT NOT NULL,
    comment_status VARCHAR(50) NOT NULL DEFAULT 'PUBLISHED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_board_comments_post_id (post_id),
    KEY idx_board_comments_author_id (author_id),
    KEY idx_board_comments_parent_id (parent_comment_id),
    CONSTRAINT fk_board_comments_post_id
        FOREIGN KEY (post_id)
        REFERENCES board_posts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_board_comments_parent_id
        FOREIGN KEY (parent_comment_id)
        REFERENCES board_comments(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_board_comments_author_id
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS board_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NULL,
    comment_id BIGINT NULL,
    uploaded_by BIGINT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    download_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_board_attachments_post_id (post_id),
    KEY idx_board_attachments_comment_id (comment_id),
    KEY idx_board_attachments_uploaded_by (uploaded_by),
    CONSTRAINT fk_board_attachments_post_id
        FOREIGN KEY (post_id)
        REFERENCES board_posts(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_board_attachments_comment_id
        FOREIGN KEY (comment_id)
        REFERENCES board_comments(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_board_attachments_uploaded_by
        FOREIGN KEY (uploaded_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_weather_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NULL,
    provider VARCHAR(100) NULL,
    location_name VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    temperature DECIMAL(5,2) NULL,
    precipitation DECIMAL(8,2) NULL,
    wind_speed DECIMAL(8,2) NULL,
    visibility DECIMAL(8,2) NULL,
    weather_condition VARCHAR(100) NULL,
    raw_response_json JSON NULL,
    observed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_its_weather_incident_id (incident_id),
    KEY idx_its_weather_observed_at (observed_at),
    CONSTRAINT fk_its_weather_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_traffic_snapshots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NULL,
    provider VARCHAR(100) NULL,
    road_name VARCHAR(100) NULL,
    direction VARCHAR(50) NULL,
    speed_avg DECIMAL(8,2) NULL,
    traffic_volume INT NULL,
    congestion_level VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    raw_response_json JSON NULL,
    observed_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_its_traffic_incident_id (incident_id),
    KEY idx_its_traffic_observed_at (observed_at),
    CONSTRAINT fk_its_traffic_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS its_risk_scores (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NOT NULL,
    weather_snapshot_id BIGINT NULL,
    traffic_snapshot_id BIGINT NULL,
    risk_score DECIMAL(6,3) NOT NULL,
    risk_level VARCHAR(50) NOT NULL,
    score_detail_json JSON NULL,
    calculated_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_its_risk_incident_id (incident_id),
    KEY idx_its_risk_level (risk_level),
    CONSTRAINT fk_its_risk_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_its_risk_weather_id
        FOREIGN KEY (weather_snapshot_id)
        REFERENCES its_weather_snapshots(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_its_risk_traffic_id
        FOREIGN KEY (traffic_snapshot_id)
        REFERENCES its_traffic_snapshots(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS external_api_logs (
    id BIGINT NOT NULL AUTO_INCREMENT,
    service_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    method VARCHAR(20) NOT NULL,
    request_json JSON NULL,
    response_status_code INT NULL,
    response_json JSON NULL,
    latency_ms INT NULL,
    is_success TINYINT NOT NULL DEFAULT 0,
    error_message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_external_api_service_created (service_name, created_at),
    KEY idx_external_api_success (is_success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NULL,
    incident_id BIGINT NULL,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    is_read TINYINT NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_read_created (user_id, is_read, created_at),
    KEY idx_notifications_incident_id (incident_id),
    KEY idx_notifications_type_priority (notification_type, priority),
    CONSTRAINT fk_notifications_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_notifications_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    notification_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    delivery_channel VARCHAR(50) NOT NULL DEFAULT 'WEB_SOCKET',
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT NULL,
    delivered_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notification_deliveries_notification_id (notification_id),
    KEY idx_notification_deliveries_user_id (user_id),
    KEY idx_notification_deliveries_status (delivery_status),
    CONSTRAINT fk_notification_deliveries_notification_id
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_notification_deliveries_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_rooms (
    id BIGINT NOT NULL AUTO_INCREMENT,
    incident_id BIGINT NULL,
    room_type VARCHAR(50) NOT NULL DEFAULT 'INCIDENT',
    room_status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_chat_rooms_incident_id (incident_id),
    KEY idx_chat_rooms_status (room_status),
    CONSTRAINT fk_chat_rooms_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_chat_rooms_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    incident_id BIGINT NULL,
    sender_user_id BIGINT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    message TEXT NOT NULL,
    attachment_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_chat_messages_room_created (room_id, created_at),
    KEY idx_chat_messages_incident_id (incident_id),
    KEY idx_chat_messages_sender_id (sender_user_id),
    CONSTRAINT fk_chat_messages_room_id
        FOREIGN KEY (room_id)
        REFERENCES chat_rooms(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chat_messages_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_chat_messages_sender_id
        FOREIGN KEY (sender_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_chat_messages_attachment_id
        FOREIGN KEY (attachment_id)
        REFERENCES board_attachments(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_message_reads (
    id BIGINT NOT NULL AUTO_INCREMENT,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chat_message_reads_message_user (message_id, user_id),
    KEY idx_chat_message_reads_user_id (user_id),
    CONSTRAINT fk_chat_message_reads_message_id
        FOREIGN KEY (message_id)
        REFERENCES chat_messages(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chat_message_reads_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NULL,
    incident_id BIGINT NULL,
    conversation_status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    title VARCHAR(200) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_chatbot_conversations_user_id (user_id),
    KEY idx_chatbot_conversations_incident_id (incident_id),
    CONSTRAINT fk_chatbot_conversations_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_chatbot_conversations_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chatbot_messages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversation_id BIGINT NOT NULL,
    incident_id BIGINT NULL,
    user_id BIGINT NULL,
    sender_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    llm_model_name VARCHAR(100) NULL,
    prompt_text TEXT NULL,
    context_json JSON NULL,
    token_usage_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_chatbot_messages_conversation_created (conversation_id, created_at),
    KEY idx_chatbot_messages_incident_id (incident_id),
    KEY idx_chatbot_messages_user_id (user_id),
    CONSTRAINT fk_chatbot_messages_conversation_id
        FOREIGN KEY (conversation_id)
        REFERENCES chatbot_conversations(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_chatbot_messages_incident_id
        FOREIGN KEY (incident_id)
        REFERENCES incidents(id)
        ON DELETE SET NULL,
    CONSTRAINT fk_chatbot_messages_user_id
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
