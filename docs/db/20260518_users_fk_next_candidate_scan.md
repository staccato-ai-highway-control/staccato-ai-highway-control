# Users FK next candidate scan

Date: 2026-05-18
Target DB: `staccato_test`
Purpose: Select the next users FK dry-run target after board -> users FK validation.

---

## 1. Background

PR #105 added the database FK inventory.

PR #106 validated the board -> users FK removal dry-run on `staccato_test`.

The next step is to select a non-board users FK candidate group for a separate dry-run.

This document does not execute or approve production DB changes.

---

## 2. Safety rules

- Production DB `staccato` must not be modified.
- This scan must only use `staccato_test`.
- This phase is read-only.
- No `ALTER TABLE` is included in this document.
- Any selected candidate still requires separate check/drop/rollback SQL.
- Any production migration requires a separate approval, backup plan, and maintenance window decision.

---

## 3. Scan identity

The scan was executed from FLASK-vm using `TEST_DATABASE_URL`.

- DATABASE: `staccato_test`
- CURRENT_USER: `staccato_test_runner@192.168.0.187`

---

## 4. Users FK scan summary

| Item | Result |
|---|---:|
| Total users FK count | 33 |
| Board FKs already covered by PR #106 | 4 |
| Remaining non-board users FK candidates | 29 |
| Tables with row_count > 0 | 0 |
| FK columns with non_null_count > 0 | 0 |
| FK candidates with orphan_count > 0 | 0 |

All scanned tables currently have `row_count = 0`, `non_null_count = 0`, and `orphan_count = 0` in `staccato_test`.

---

## 5. Already covered by PR #106

| table | column | constraint |
|---|---|---|
| `board_posts` | `author_id` | `board_posts_ibfk_1` |
| `board_comments` | `author_id` | `board_comments_ibfk_3` |
| `board_attachments` | `uploaded_by` | `board_attachments_ibfk_3` |
| `board_reactions` | `user_id` | `board_reactions_ibfk_2` |

These board-domain FKs were already validated through the board -> users FK dry-run in PR #106.

---

## 6. Remaining users FK candidates

| table | column | constraint | priority note |
|---|---|---|---|
| `security_logs` | `actor_user_id` | `security_logs_ibfk_1` | recommended next |
| `notifications` | `user_id` | `notifications_ibfk_1` | good later candidate |
| `notification_deliveries` | `user_id` | `notification_deliveries_ibfk_2` | good later candidate |
| `training_datasets` | `created_by` | `training_datasets_ibfk_1` | possible later |
| `training_jobs` | `requested_by` | `training_jobs_ibfk_5` | possible later |
| `ai_models` | `owner_user_id` | `ai_models_ibfk_1` | possible later |
| `email_verifications` | `user_id` | `email_verifications_ibfk_1` | defer |
| `signup_requests` | `user_id` | `signup_requests_ibfk_1` | defer |
| `chat_message_reads` | `user_id` | `chat_message_reads_ibfk_2` | defer |
| `chat_messages` | `sender_user_id` | `chat_messages_ibfk_3` | defer |
| `chat_room_members` | `user_id` | `chat_room_members_ibfk_2` | defer |
| `chat_rooms` | `created_by` | `chat_rooms_ibfk_2` | defer |
| `chatbot_conversations` | `user_id` | `chatbot_conversations_ibfk_1` | defer |
| `chatbot_messages` | `user_id` | `chatbot_messages_ibfk_3` | defer |
| `incident_memos` | `author_user_id` | `incident_memos_ibfk_2` | defer |
| `incident_reports` | `reporter_id` | `incident_reports_ibfk_1` | defer |
| `incident_reports` | `reviewed_by` | `incident_reports_ibfk_2` | defer |
| `incident_reports` | `closed_by` | `incident_reports_ibfk_3` | defer |
| `incident_reports` | `deleted_by` | `incident_reports_ibfk_4` | defer |
| `incident_status_histories` | `changed_by` | `incident_status_histories_ibfk_2` | defer |
| `llm_reports` | `generated_by` | `llm_reports_ibfk_2` | defer |
| `llm_report_versions` | `edited_by` | `llm_report_versions_ibfk_2` | defer |
| `llm_report_status_histories` | `changed_by` | `llm_report_status_histories_ibfk_2` | defer |
| `report_analysis_jobs` | `requested_by` | `report_analysis_jobs_ibfk_3` | defer |
| `report_attachments` | `uploaded_by` | `report_attachments_ibfk_2` | defer |
| `report_attachments` | `deleted_by` | `report_attachments_ibfk_3` | defer |
| `report_locations` | `confirmed_by` | `report_locations_ibfk_2` | defer |
| `report_memos` | `author_id` | `report_memos_ibfk_2` | defer |
| `report_status_histories` | `changed_by` | `report_status_histories_ibfk_2` | defer |

---

## 7. Candidate selection criteria

| Criterion | Meaning |
|---|---|
| `orphan_count = 0` | Required before FK removal dry-run |
| Low active feature risk | Avoid domains currently under unstable PRs |
| Clear domain boundary | Prefer FK from non-member domain into `users` |
| Low runtime coupling | Prefer tables where app code can tolerate plain user id |
| Rollback simplicity | FK can be recreated without data cleanup |
| Small FK scope | Prefer one or two FKs for the next dry-run |
| Test coverage | Existing tests should catch obvious regressions |

---

## 8. Candidate ranking

| Rank | Candidate | Scope | Recommendation | Reason |
|---:|---|---:|---|---|
| 1 | `security_logs.actor_user_id` | 1 FK | Recommended next | Log/audit table, simple rollback, low domain coupling |
| 2 | `notifications.user_id`, `notification_deliveries.user_id` | 2 FKs | Good next group | Notification domain can likely keep plain user ids |
| 3 | `training_datasets.created_by`, `training_jobs.requested_by` | 2 FKs | Possible later | AI/training feature activity should be checked first |
| 4 | `ai_models.owner_user_id` | 1 FK | Possible later | Ownership semantics may need service-level validation |
| 5 | `email_verifications.user_id`, `signup_requests.user_id` | 2 FKs | Defer | Auth/signup flow is sensitive |
| 6 | `chat_*`, `chatbot_*` | Multiple FKs | Defer | Chat runtime membership/user semantics are more coupled |
| 7 | `incident_*`, `report_*`, `llm_*` | Multiple FKs | Defer | Incident/report domain should be planned as a larger boundary |

---

## 9. Recommended next dry-run target

Recommended target:

- `security_logs.actor_user_id -> users.id`
- Constraint: `security_logs_ibfk_1`

Rationale:

- It is a single-FK dry-run candidate.
- It belongs to a log/audit-style table.
- It is less likely to require strong relational enforcement than auth, chat, incident, or report workflows.
- It is structurally simple to check, drop, verify, and rollback.
- It keeps the next dry-run small and reversible.

---

## 10. Proposed next PR

Create a separate PR for the actual dry-run SQL.

Suggested branch:

- `chore/db-security-logs-users-fk-dry-run-plan`

Suggested files:

- `docs/db/20260518_security_logs_users_fk_dry_run_plan.md`
- `docs/db/sql/04_check_security_logs_users_fk.sql`
- `docs/db/sql/05_drop_security_logs_users_fk.sql`
- `docs/db/sql/06_rollback_security_logs_users_fk.sql`

Suggested dry-run flow:

1. Confirm baseline tests.
2. Run check SQL on `staccato_test` only.
3. Confirm `security_logs.actor_user_id` FK exists.
4. Confirm `orphan_count = 0`.
5. Run drop SQL on `staccato_test` only.
6. Confirm target FK is removed.
7. Run tests.
8. Run rollback SQL.
9. Confirm FK is restored.
10. Run tests again.
11. Record result.

---

## 11. Decision

Proceed with `security_logs.actor_user_id -> users.id` as the next users FK dry-run candidate, unless the team prefers to batch notification-related FKs first.

This document is read-only and does not change any database schema.
