CREATE TABLE IF NOT EXISTS cctv_slots (
    slot_number INT NOT NULL AUTO_INCREMENT,
    cctv_id BIGINT NULL,
    cctv_code VARCHAR(50) NULL,
    display_name VARCHAR(100) NULL,
    layout_json JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (slot_number),
    CONSTRAINT fk_cctv_slots_cctv_id
        FOREIGN KEY (cctv_id)
        REFERENCES cctvs(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cctv_slots (slot_number, cctv_id, cctv_code, display_name, layout_json, created_at, updated_at)
VALUES
    (1, NULL, NULL, 'Slot 1', NULL, NOW(), NULL),
    (2, NULL, NULL, 'Slot 2', NULL, NOW(), NULL),
    (3, NULL, NULL, 'Slot 3', NULL, NOW(), NULL),
    (4, NULL, NULL, 'Slot 4', NULL, NOW(), NULL)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name);
