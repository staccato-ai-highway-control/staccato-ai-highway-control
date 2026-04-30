# STACCATO 브랜치 및 PR 규칙

## 1. 브랜치 역할

| 브랜치 | 역할 |
|---|---|
| `main` | 최종 안정 버전 |
| `develop` | 개발 통합 브랜치 |
| `feat/*` | 기능 개발 |
| `fix/*` | 버그 수정 |
| `docs/*` | 문서 작업 |
| `db/*` | DB 스키마 작업 |
| `refactor/*` | 리팩토링 |

---

## 2. 기본 작업 흐름

새 작업은 항상 최신 `develop`에서 시작한다.

```powershell
git switch develop
git pull origin develop
git switch -c feat/example
git push -u origin feat/example
```

작업 후:

```powershell
git add .
git commit -m "feat: 작업 내용"
git push origin feat/example
```

GitHub에서 PR 생성:

```text
base: develop
compare: feat/example
```

---

## 3. Merge 규칙

PR 검증 후 `develop`에 병합한다.

기본 병합 방식:

```text
Squash and merge
```

Merge 후 작업 브랜치는 삭제한다.

```powershell
git switch develop
git pull origin develop
git branch -D feat/example
git push origin --delete feat/example
```

---

## 4. 기존 브랜치를 계속 쓰지 않는 이유

기능 브랜치는 작업 단위로 짧게 사용한다.

Merge가 끝난 뒤 추가 수정이 필요하면 기존 브랜치를 다시 사용하지 않고, 최신 `develop`에서 새 브랜치를 만든다.

예시:

| 상황 | 브랜치 |
|---|---|
| 회원가입 버그 수정 | `fix/auth-signup-validation` |
| 관리자 승인 기능 추가 | `feat/auth-admin` |
| CCTV 관리 기능 추가 | `feat/cctv-roi` |
| 문서 수정 | `docs/setup-guide` |
| DB 수정 | `db/schema-update` |

---

## 5. 직접 push 금지

아래 브랜치에는 직접 push하지 않는다.

```text
main
develop
```

모든 작업은 PR로 병합한다.

---

## 6. PR 작성 기준

PR에는 아래 내용을 포함한다.

- 작업 내용
- 추가/수정된 API
- 수정된 주요 파일
- 검증 내용
- 참고 사항

---

## 7. 커밋 메시지 규칙

| Prefix | 의미 |
|---|---|
| `feat:` | 기능 추가 |
| `fix:` | 버그 수정 |
| `docs:` | 문서 추가/수정 |
| `db:` | DB 스키마 변경 |
| `refactor:` | 리팩토링 |
| `chore:` | 기타 설정/정리 |

예시:

```text
feat: add CCTV management APIs
fix: update signup validation
docs: add module structure guide
db: add incident history table
```
