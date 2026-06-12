-- CCTV 대시보드의 고정 슬롯 1~4를 저장하는 테이블을 생성합니다.
-- cctv가 삭제되어도 화면 배치 자체는 유지하도록 외래 키를 NULL로 전환합니다.
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

-- 재실행 시 기존 CCTV 배정은 보존하고 기본 표시 이름만 최신값으로 맞춥니다.
INSERT INTO cctv_slots (slot_number, cctv_id, cctv_code, display_name, layout_json, created_at, updated_at)
VALUES
    (1, NULL, NULL, 'Slot 1', NULL, NOW(), NULL),
    (2, NULL, NULL, 'Slot 2', NULL, NOW(), NULL),
    (3, NULL, NULL, 'Slot 3', NULL, NOW(), NULL),
    (4, NULL, NULL, 'Slot 4', NULL, NOW(), NULL)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name);
