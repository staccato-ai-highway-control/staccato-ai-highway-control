# board -> users FK 제거 dry-run 계획

작성일: 2026-05-18
대상 DB: staccato_test
운영 DB 적용 여부: 적용 금지

---

## 1. 목적

board 도메인이 users 테이블을 FK로 직접 참조하는 구조를 제거할 수 있는지 테스트 DB에서 검증한다.

---

## 2. 제거 대상 FK

| 테이블 | 컬럼 | FK 이름 | 참조 |
|---|---|---|---|
| board_posts | author_id | board_posts_ibfk_1 | users.id |
| board_comments | author_id | board_comments_ibfk_3 | users.id |
| board_attachments | uploaded_by | board_attachments_ibfk_3 | users.id |
| board_reactions | user_id | board_reactions_ibfk_2 | users.id |

---

## 3. 실행 전 조건

- 운영 DB에서 실행 금지
- staccato_test에서만 실행
- 실행 전 pytest 통과 확인
- FK 제거 후 pytest 재실행
- 실패 시 rollback SQL로 복구
- board PR #85가 안정화되기 전 운영 반영 금지

---

## 4. 실행 순서

1. 현재 테스트 통과 확인
2. staccato_test에서 FK 제거 dry-run 실행
3. 제거 대상 FK 4개가 사라졌는지 확인
4. board 내부 FK는 유지됐는지 확인
5. pytest 재실행
6. 실패 시 rollback 실행
7. rollback 후 pytest 재실행

---

## 5. 성공 기준

- FK 제거 SQL 실행 성공
- board_posts.author_id -> users.id 제거
- board_comments.author_id -> users.id 제거
- board_attachments.uploaded_by -> users.id 제거
- board_reactions.user_id -> users.id 제거
- board 내부 FK는 유지
- pytest failed 0개

---

## 6. 현재 판단

이번 작업은 운영 DB 변경이 아니다.

운영 DB 적용 전에는 SQLAlchemy 모델의 ForeignKey 제거, 서비스 코드 영향도 확인, migration 방식 확정, rollback 절차 확정이 필요하다.
