# STACCATO 백엔드 개발 규칙

## 1. 기본 원칙

Flask Server는 STACCATO의 메인 백엔드 서버이며, 모든 DB 접근은 Flask Server에서만 수행한다.

AI Server와 ITS Server는 DB에 직접 접근하지 않는다.

---

## 2. 파일 작성 기준

백엔드 기능을 추가할 때는 아래 단위로 파일을 나눈다.

| 폴더 | 역할 |
|---|---|
| `models/` | SQLAlchemy 모델 |
| `routes/` | API Endpoint |
| `services/` | 비즈니스 로직 |
| `clients/` | 외부 서버/API 호출 |
| `utils/` | 공통 유틸리티 |

예시:

CCTV 기능을 추가할 경우:

```text
flask-vm/app/models/cctv_models.py
flask-vm/app/routes/cctv_routes.py
flask-vm/app/services/cctv_service.py
```

---

## 3. Route 작성 규칙

Route는 HTTP 요청과 응답만 처리한다.

Route에서 처리할 것:

- request body 읽기
- query parameter 읽기
- 인증 사용자 확인
- Service 호출
- JSON 응답 반환

Route에서 금지할 것:

- 직접 DB 쿼리 남발
- 복잡한 비즈니스 로직 작성
- AI/ITS/LLM 직접 호출
- 파일 저장 로직 직접 작성

---

## 4. Service 작성 규칙

Service는 실제 비즈니스 로직을 담당한다.

Service에서 처리할 것:

- DB 조회/생성/수정
- 상태 변경
- 보안 로그 생성
- 외부 client 호출
- 트랜잭션 처리
- 예외 처리

---

## 5. Model 작성 규칙

Model은 DB 테이블과 Python 클래스를 연결한다.

원칙:

- DB 컬럼명과 모델 필드명을 동일하게 유지한다.
- 모델 클래스명은 PascalCase를 사용한다.
- 테이블명은 snake_case 복수형을 사용한다.
- 비밀번호, 토큰 등 민감정보는 응답에 포함하지 않는다.
- 응답 변환이 필요한 경우 `to_dict()` 또는 `to_public_dict()`를 사용한다.

---

## 6. 인증/권한 규칙

인증이 필요한 API는 `require_auth`를 사용한다.

관리자 권한이 필요한 API는 `require_roles`를 사용한다.

예시:

```python
@require_roles("SUPER_ADMIN", "AUTH_ADMIN")
def approve_signup_request():
    ...
```

---

## 7. 응답 규칙

성공 응답:

```json
{
  "message": "Success message",
  "data": {}
}
```

실패 응답:

```json
{
  "message": "Error message"
}
```

---

## 8. 커밋 전 확인

커밋 전 반드시 확인한다.

```powershell
git status
```

아래 파일은 Git에 올라가면 안 된다.

```text
.env
.venv/
node_modules/
.next/
storage/uploads/*
storage/models/*
storage/datasets/*
```
