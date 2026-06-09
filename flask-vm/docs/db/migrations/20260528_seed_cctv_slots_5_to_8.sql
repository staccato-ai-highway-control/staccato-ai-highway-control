INSERT INTO cctv_slots (slot_number, cctv_id, cctv_code, display_name, layout_json, created_at, updated_at)
VALUES
    (5, NULL, NULL, 'Slot 5', NULL, NOW(), NULL),
    (6, NULL, NULL, 'Slot 6', NULL, NOW(), NULL),
    (7, NULL, NULL, 'Slot 7', NULL, NOW(), NULL),
    (8, NULL, NULL, 'Slot 8', NULL, NOW(), NULL)
ON DUPLICATE KEY UPDATE
    display_name = VALUES(display_name);
