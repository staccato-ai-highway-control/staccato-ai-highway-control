-- 관리자용 프로젝트 자료 메타데이터와 소프트 삭제 상태를 저장합니다.
-- 작성 사용자가 삭제되어도 자료 이력을 유지하기 위해 author_id는 NULL로 전환합니다.
CREATE TABLE IF NOT EXISTS project_resources (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    category VARCHAR(50) NOT NULL,
    author_id BIGINT NULL,
    author_name VARCHAR(100) NULL,
    file_name VARCHAR(255) NULL,
    file_path VARCHAR(500) NULL,
    file_type VARCHAR(20) NULL,
    file_size BIGINT NULL,
    visibility VARCHAR(50) NOT NULL DEFAULT 'ADMIN_ALL',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    INDEX idx_project_resources_category (category),
    INDEX idx_project_resources_visibility (visibility),
    INDEX idx_project_resources_deleted_at (deleted_at),
    CONSTRAINT fk_project_resources_author
        FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 개발 화면 확인용 메타데이터를 넣되 제목과 카테고리가 같으면 중복 생성하지 않습니다.
-- 실제 파일은 포함하지 않으므로 file_* 컬럼은 NULL로 시작합니다.
INSERT INTO project_resources (
    title,
    description,
    category,
    author_id,
    author_name,
    file_name,
    file_path,
    file_type,
    file_size,
    visibility,
    created_at,
    updated_at,
    deleted_at
)
SELECT
    seed.title,
    seed.description,
    seed.category,
    NULL,
    'STACCATO 팀',
    NULL,
    NULL,
    NULL,
    NULL,
    'SUPER_ADMIN_ONLY',
    NOW(),
    NOW(),
    NULL
FROM (
    SELECT '김도하 이력서' AS title, '개발 확인용 샘플 제목입니다.' AS description, 'RESUME' AS category
    UNION ALL
    SELECT '김도하 자기소개서', '개발 확인용 샘플 제목입니다.', 'COVER_LETTER'
    UNION ALL
    SELECT 'STACCATO 최종 발표자료', '개발 확인용 샘플 제목입니다.', 'PRESENTATION'
    UNION ALL
    SELECT '0605 회의록', '개발 확인용 샘플 제목입니다.', 'MEETING_NOTE'
) seed
WHERE NOT EXISTS (
    SELECT 1
    FROM project_resources existing
    WHERE existing.title = seed.title
      AND existing.category = seed.category
);
