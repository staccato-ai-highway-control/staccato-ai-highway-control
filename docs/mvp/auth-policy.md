# STACCATO MVP 인증 및 권한 정책

## 1. 인증 방식

MVP는 이메일/비밀번호 기반 로그인과 JWT Access Token을 사용한다.

인증 흐름:

1. 사용자가 회원가입 요청
2. users 테이블에 PENDING 상태로 생성
3. signup_requests 테이블에 승인 요청 생성
4. 관리자가 승인하면 ACTIVE 상태로 변경
5. 사용자는 로그인 후 JWT Token 발급
6. 인증이 필요한 API는 Bearer Token으로 접근

## 2. 계정 상태

| 상태 | 설명 |
|---|---|
| PENDING | 가입 요청 후 승인 대기 |
| ACTIVE | 사용 가능 |
| REJECTED | 가입 거절 |
| SUSPENDED | 사용 중지 |
| DELETED | 삭제 처리 |

## 3. 역할

| 역할 | 설명 |
|---|---|
| SUPER_ADMIN | 전체 관리자 |
| AUTH_ADMIN | 회원 승인/권한 관리자 |
| CONTROL_ADMIN | 관제 관리자 |
| DISPATCH_ADMIN | 출동/조치 관리자 |
| MAINTENANCE_ADMIN | 장비/시설 관리자 |
| VIEWER | 조회 사용자 |

## 4. 권한 기준

| 기능 | 허용 역할 |
|---|---|
| 회원가입 요청 | 비로그인 사용자 |
| 로그인 | ACTIVE 사용자 |
| 내 정보 조회 | 로그인 사용자 |
| 회원 승인/거절 | SUPER_ADMIN, AUTH_ADMIN |
| CCTV 등록/수정 | SUPER_ADMIN, CONTROL_ADMIN, MAINTENANCE_ADMIN |
| ROI 등록/수정 | SUPER_ADMIN, CONTROL_ADMIN, MAINTENANCE_ADMIN |
| 사건 상태 변경 | SUPER_ADMIN, CONTROL_ADMIN, DISPATCH_ADMIN |
| 보고서 생성 | SUPER_ADMIN, CONTROL_ADMIN |
| MLOps 관리 | SUPER_ADMIN |

## 5. 보안 로그

다음 행위는 security_logs에 기록한다.

- 회원가입 요청
- 로그인 성공
- 로그인 실패
- 회원 승인
- 회원 거절
- 권한 변경
- 사건 상태 변경
- 보고서 생성
- 파일 업로드
- 외부 API 호출 실패

## 6. JWT 기준

JWT Payload 기본 필드:

{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "VIEWER",
  "iat": 1234567890,
  "exp": 1234567890
}

만료 시간은 .env의 JWT_EXPIRES_HOURS 값을 따른다.

## 7. MVP 구현 상태

현재 구현 완료:

- POST /auth/signup
- POST /auth/login
- GET /auth/me
- GET /auth/health

후속 구현 예정:

- GET /auth/signup-requests
- POST /auth/signup-requests/{id}/approve
- POST /auth/signup-requests/{id}/reject
- GET /auth/users
- 권한별 접근 제어
