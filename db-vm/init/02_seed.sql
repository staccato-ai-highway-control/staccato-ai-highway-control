-- STACCATO Initial Seed Data
-- Minimum local development data.

USE staccato;

UPDATE cctvs
SET
    cctv_name = '테스트 CCTV 001',
    stream_url = 'rtsp://example.com/test-stream',
    location_name = '테스트 고속도로 구간',
    road_name = '경부고속도로',
    direction = '서울방향',
    latitude = 37.5665000,
    longitude = 126.9780000,
    is_active = 1,
    updated_at = NOW()
WHERE cctv_code = 'CCTV-TEST-001';

INSERT INTO cctvs (
    cctv_code,
    cctv_name,
    stream_url,
    location_name,
    road_name,
    direction,
    latitude,
    longitude,
    is_active,
    created_at,
    updated_at
)
SELECT
    'CCTV-TEST-001',
    '테스트 CCTV 001',
    'rtsp://example.com/test-stream',
    '테스트 고속도로 구간',
    '경부고속도로',
    '서울방향',
    37.5665000,
    126.9780000,
    1,
    NOW(),
    NULL
WHERE NOT EXISTS (
    SELECT 1 FROM cctvs WHERE cctv_code = 'CCTV-TEST-001'
);

INSERT INTO cctv_rois (
    cctv_id,
    roi_type,
    roi_name,
    polygon_json,
    is_active,
    created_at,
    updated_at
)
SELECT
    c.id,
    'DRIVING_LANE',
    '테스트 주행차로 ROI',
    JSON_ARRAY(
        JSON_OBJECT('x', 100, 'y', 200),
        JSON_OBJECT('x', 800, 'y', 200),
        JSON_OBJECT('x', 900, 'y', 600),
        JSON_OBJECT('x', 80, 'y', 600)
    ),
    1,
    NOW(),
    NULL
FROM cctvs c
WHERE c.cctv_code = 'CCTV-TEST-001'
  AND NOT EXISTS (
      SELECT 1
      FROM cctv_rois r
      WHERE r.cctv_id = c.id
        AND r.roi_type = 'DRIVING_LANE'
        AND r.roi_name = '테스트 주행차로 ROI'
  );

INSERT INTO cctv_rois (
    cctv_id,
    roi_type,
    roi_name,
    polygon_json,
    is_active,
    created_at,
    updated_at
)
SELECT
    c.id,
    'SHOULDER',
    '테스트 갓길 ROI',
    JSON_ARRAY(
        JSON_OBJECT('x', 900, 'y', 200),
        JSON_OBJECT('x', 1200, 'y', 200),
        JSON_OBJECT('x', 1280, 'y', 600),
        JSON_OBJECT('x', 920, 'y', 600)
    ),
    1,
    NOW(),
    NULL
FROM cctvs c
WHERE c.cctv_code = 'CCTV-TEST-001'
  AND NOT EXISTS (
      SELECT 1
      FROM cctv_rois r
      WHERE r.cctv_id = c.id
        AND r.roi_type = 'SHOULDER'
        AND r.roi_name = '테스트 갓길 ROI'
  );
