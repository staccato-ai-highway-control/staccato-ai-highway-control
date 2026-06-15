-- 기존 cctv_slots 테이블을 8분할 화면까지 확장하는 기본 슬롯 데이터입니다.
-- 선행 마이그레이션으로 테이블과 슬롯 1~4가 생성된 뒤 적용해야 합니다.
INSERT INTO cctv_slots (slot_number, cctv_id, cctv_code, display_name, layout_json, created_at, updated_at)
VALUES
    (5, NULL, NULL, 'Slot 5', NULL, NOW(), NULL),
    (6, NULL, NULL, 'Slot 6', NULL, NOW(), NULL),
    (7, NULL, NULL, 'Slot 7', NULL, NOW(), NULL),
    (8, NULL, NULL, 'Slot 8', NULL, NOW(), NULL)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name);
