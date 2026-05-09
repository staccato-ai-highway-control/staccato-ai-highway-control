-- STACCATO Initial Seed Data
-- Minimum local development data.

USE staccato;

INSERT INTO cctvs (
    cctv_code,
    cctv_name,
    stream_url,
    location_name,
    road_name,
    direction,
    latitude,
    longitude,
    is_active
) VALUES (
    'CCTV-TEST-001',
    '테스트 CCTV 001',
    'rtsp://example.com/test-stream',
    '테스트 고속도로 구간',
    '경부고속도로',
    '서울방향',
    37.5665000,
    126.9780000,
    1
)
ON DUPLICATE KEY UPDATE
    cctv_name = VALUES(cctv_name),
    stream_url = VALUES(stream_url),
    location_name = VALUES(location_name),
    road_name = VALUES(road_name),
    direction = VALUES(direction),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude),
    is_active = VALUES(is_active);

INSERT INTO cctv_rois (
    cctv_id,
    roi_type,
    roi_name,
    polygon_json,
    is_active
)
SELECT
    id,
    'DRIVING_LANE',
    '테스트 주행차로 ROI',
    JSON_ARRAY(
        JSON_OBJECT('x', 100, 'y', 200),
        JSON_OBJECT('x', 800, 'y', 200),
        JSON_OBJECT('x', 900, 'y', 600),
        JSON_OBJECT('x', 80, 'y', 600)
    ),
    1
FROM cctvs
WHERE cctv_code = 'CCTV-TEST-001';

INSERT INTO cctv_rois (
    cctv_id,
    roi_type,
    roi_name,
    polygon_json,
    is_active
)
SELECT
    id,
    'SHOULDER',
    '테스트 갓길 ROI',
    JSON_ARRAY(
        JSON_OBJECT('x', 900, 'y', 200),
        JSON_OBJECT('x', 1200, 'y', 200),
        JSON_OBJECT('x', 1280, 'y', 600),
        JSON_OBJECT('x', 920, 'y', 600)
    ),
    1
FROM cctvs
WHERE cctv_code = 'CCTV-TEST-001';