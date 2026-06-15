"""resources API에서 사용하는 입력 스키마와 검증 규칙을 정의한다.

외부 요청 값을 내부 서비스가 기대하는 명확한 형태로 정규화한다."""

# 설명: `ALLOWED_RESOURCE_CATEGORIES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ALLOWED_RESOURCE_CATEGORIES = {
    "RESUME",
    "COVER_LETTER",
    "PRESENTATION",
    "MEETING_NOTE",
    "ACCESS_LOG",
}

# 설명: `RESOURCE_CATEGORY_LABELS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
RESOURCE_CATEGORY_LABELS = {
    "RESUME": "조원 이력서",
    "COVER_LETTER": "자기소개서",
    "PRESENTATION": "프로젝트 발표자료",
    "MEETING_NOTE": "회의록",
    "ACCESS_LOG": "접속 로그",
}

# 설명: `ALLOWED_RESOURCE_VISIBILITIES`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ALLOWED_RESOURCE_VISIBILITIES = {
    "ADMIN_ALL",
    "SUPER_ADMIN_ONLY",
    "OWNER_ONLY",
}

# 설명: `ALLOWED_RESOURCE_EXTENSIONS`에 이후 전달하거나 누적할 구조화 데이터를 초기화한다.
ALLOWED_RESOURCE_EXTENSIONS = {
    "pdf",
    "ppt",
    "pptx",
    "doc",
    "docx",
    "hwp",
    "hwpx",
    "md",
    "txt",
    "jpg",
    "jpeg",
    "png",
    "zip",
}
