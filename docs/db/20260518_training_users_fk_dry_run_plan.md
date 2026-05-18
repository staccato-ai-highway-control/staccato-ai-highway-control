# Training -> users FK dry-run plan

Date: 2026-05-18
Target DB: `staccato_test`
Target FKs:
- `training_datasets.created_by -> users.id`
- `training_jobs.requested_by -> users.id`

---

## 1. Purpose

Validate whether the training domain can remove direct foreign key dependencies on `users.id`.

This is a test DB dry-run only.

No production DB change is approved by this document.

---

## 2. Background

Previous DB documentation work has been completed:

- PR #105 added the database FK inventory.
- PR #106 validated board -> users FK removal dry-run.
- PR #107 scanned the next users FK candidates.
- The notifications -> users FK dry-run was completed and merged.

The AI/training candidate check confirmed that `training_datasets.created_by` and `training_jobs.requested_by` exist in both `staccato` and `staccato_test`.

`ai_models.owner_user_id` is left for a later dry-run because model ownership semantics may require separate service-level validation.

---

## 3. Target FKs

| table | column | constraint | reference |
|---|---|---|---|
| `training_datasets` | `created_by` | `training_datasets_ibfk_1` | `users.id` |
| `training_jobs` | `requested_by` | `training_jobs_ibfk_5` | `users.id` |

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
2. Run `07_check_training_users_fk.sql`.
3. Confirm both target FKs exist.
4. Confirm all `orphan_count` values are `0`.
5. Run `08_drop_training_users_fk.sql` on `staccato_test` only.
6. Confirm both target FKs are removed.
7. Run tests.
8. Run `09_rollback_training_users_fk.sql`.
9. Confirm both target FKs are restored.
10. Run tests again.
11. Record dry-run result in this document.

---

## 6. Success criteria

- `training_datasets_ibfk_1` exists before drop.
- `training_jobs_ibfk_5` exists before drop.
- All orphan checks return `0`.
- FK drop SQL succeeds on `staccato_test`.
- `training_datasets.created_by` column remains.
- `training_jobs.requested_by` column remains.
- Target FKs are absent after drop.
- Automated tests pass after drop.
- Rollback SQL restores both target FKs.
- Automated tests pass after rollback.

---

## 7. Current status

Prepared for dry-run.

Execution result will be recorded after validation.
