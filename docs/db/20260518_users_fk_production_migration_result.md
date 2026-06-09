# users FK production migration result

Date: 2026-05-18  
Target DB: `staccato`  
Purpose: 도메인 DB 분리를 위한 `users.id` FK constraint 운영 제거 결과 기록

---

## 1. 요약

운영 DB `staccato`에서 dry-run 완료 범위의 `users.id` FK constraint 11개를 제거했습니다.

이번 작업은 DB 레벨 FK constraint 제거 작업입니다.

아래 항목은 삭제하지 않았습니다.

- 테이블
- 컬럼
- 데이터

`user_id`, `author_id`, `created_by`, `sender_user_id` 같은 식별자 컬럼은 유지했습니다.

---

## 2. 사전 백업

운영 반영 전 DB 백업을 수행했습니다.

```text
/home/staccato/db-backups/staccato_before_users_fk_drop_20260518_195800.sql.gz
