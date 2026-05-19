# Notifications -> users FK dry-run plan

Date: 2026-05-18
Target DB: `staccato_test`
Target FKs:
- `notifications.user_id -> users.id`
- `notification_deliveries.user_id -> users.id`

---

## 1. Purpose

Validate whether the notification domain can remove direct foreign key dependencies on `users.id`.

This is a test DB dry-run only.

No production DB change is approved by this document.

---

## 2. Background

Previous DB documentation work has been completed:

- PR #105 added the database FK inventory.
- PR #106 validated board -> users FK removal dry-run.
- PR #107 scanned the next users FK candidates.

The initial next candidate was `security_logs.actor_user_id`, but it was excluded because `staccato.security_logs` does not currently have the FK while `staccato_test.security_logs` does.

The next valid candidate group is the notification domain because both `staccato` and `staccato_test` have the target FKs.

---

## 3. Target FKs

| table | column | constraint | reference |
|---|---|---|---|
| `notifications` | `user_id` | `notifications_ibfk_1` | `users.id` |
| `notification_deliveries` | `user_id` | `notification_deliveries_ibfk_2` | `users.id` |

---

## 4. Safety rules

- Do not run this against production DB `staccato`.
- Run only against test DB `staccato_test`.
- Always confirm `SELECT DATABASE()` before schema changes.
- Always confirm `CURRENT_USER()` before schema changes.
- Do not drop any table.
- Do not drop any column.
- Only drop FK constraints.
- Rollback SQL must be ready before executing drop SQL.
- Production migration requires separate approval, backup plan, and maintenance window.

---

## 5. Execution order

1. Confirm baseline tests.
2. Run `04_check_notifications_users_fk.sql`.
3. Confirm both target FKs exist.
4. Confirm all `orphan_count` values are `0`.
5. Run `05_drop_notifications_users_fk.sql` on `staccato_test` only.
6. Confirm both target FKs are removed.
7. Run tests.
8. Run `06_rollback_notifications_users_fk.sql`.
9. Confirm both target FKs are restored.
10. Run tests again.
11. Record dry-run result in this document.

---

## 6. Success criteria

- `notifications_ibfk_1` exists before drop.
- `notification_deliveries_ibfk_2` exists before drop.
- All orphan checks return `0`.
- FK drop SQL succeeds on `staccato_test`.
- `notifications.user_id` column remains.
- `notification_deliveries.user_id` column remains.
- Target FKs are absent after drop.
- Automated tests pass after drop.
- Rollback SQL restores both target FKs.
- Automated tests pass after rollback.

---

## 7. Current status

Prepared for dry-run.

Execution result will be recorded after validation.

---

## 8. Dry-run execution result

Date: 2026-05-18
Target DB: `staccato_test`
Execution account: `staccato_test_runner@192.168.0.187`
Production DB touched: No

### Baseline

- `python -m compileall app tests`: passed
- `PYTHONPATH=. pytest -q`: passed

### Pre-drop check

Target notifications -> users foreign keys were found:

- `notifications.user_id -> users.id` / `notifications_ibfk_1`
- `notification_deliveries.user_id -> users.id` / `notification_deliveries_ibfk_2`

All orphan checks returned `0`.

### Drop dry-run

Executed on `staccato_test` only:

- `ALTER TABLE notification_deliveries DROP FOREIGN KEY notification_deliveries_ibfk_2`
- `ALTER TABLE notifications DROP FOREIGN KEY notifications_ibfk_1`

Post-drop check confirmed no remaining target notifications -> users FKs.

### Post-drop test

- `python -m compileall app tests`: passed
- `PYTHONPATH=. pytest -q`: passed

### Rollback verification

Rollback SQL restored the 2 target notifications -> users FKs:

- `notification_deliveries.user_id -> users.id` / `notification_deliveries_ibfk_2`
- `notifications.user_id -> users.id` / `notifications_ibfk_1`

### Post-rollback test

- `python -m compileall app tests`: passed
- `PYTHONPATH=. pytest -q`: passed

### Result

Notifications -> users FK removal dry-run passed on `staccato_test`.

This result means the target FK removal is structurally reversible and does not currently break the existing automated test suite.

This does not approve production execution by itself. Production migration still requires a separate migration plan, DB backup plan, approval, and maintenance window decision.
