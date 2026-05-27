# AI models -> users FK dry-run plan

Date: 2026-05-18
Target DB: `staccato_test`
Target FK:
- `ai_models.owner_user_id -> users.id`

---

## 1. Purpose

Validate whether the AI model domain can remove its direct foreign key dependency on `users.id`.

This is a test DB dry-run only.

No production DB change is approved by this document.

---

## 2. Background

Previous DB documentation work has been completed:

- PR #105 added the database FK inventory.
- PR #106 validated board -> users FK removal dry-run.
- PR #107 scanned the next users FK candidates.
- The notifications -> users FK dry-run was completed and merged.
- The training -> users FK dry-run was completed and merged.

The AI/training candidate check confirmed that `ai_models.owner_user_id` exists in both `staccato` and `staccato_test`.

This dry-run focuses only on the FK constraint. It does not remove the `owner_user_id` column.

---

## 3. Target FK

| table | column | constraint | reference |
|---|---|---|---|
| `ai_models` | `owner_user_id` | `ai_models_ibfk_1` | `users.id` |

---

## 4. Safety rules

- Do not run this against production DB `staccato`.
- Run only against test DB `staccato_test`.
- Always confirm `SELECT DATABASE()` before schema changes.
- Always confirm `CURRENT_USER()` before schema changes.
- Do not drop any table.
- Do not drop any column.
- Only drop the FK constraint.
- Rollback SQL must be ready before executing drop SQL.
- Production migration requires separate approval, backup plan, and maintenance window.

---

## 5. Execution order

1. Confirm baseline tests.
2. Run `10_check_ai_models_users_fk.sql`.
3. Confirm the target FK exists.
4. Confirm `orphan_count = 0`.
5. Run `11_drop_ai_models_users_fk.sql` on `staccato_test` only.
6. Confirm the target FK is removed.
7. Run tests.
8. Run `12_rollback_ai_models_users_fk.sql`.
9. Confirm the target FK is restored.
10. Run tests again.
11. Record dry-run result in this document.

---

## 6. Success criteria

- `ai_models_ibfk_1` exists before drop.
- `orphan_count = 0`.
- FK drop SQL succeeds on `staccato_test`.
- `ai_models.owner_user_id` column remains.
- Target FK is absent after drop.
- Automated tests pass after drop.
- Rollback SQL restores `ai_models_ibfk_1`.
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

Target ai_models -> users foreign key was found:

- `ai_models.owner_user_id -> users.id` / `ai_models_ibfk_1`

The orphan check returned `0`.

### Drop dry-run

Executed on `staccato_test` only:

- `ALTER TABLE ai_models DROP FOREIGN KEY ai_models_ibfk_1`

Post-drop check confirmed no remaining target ai_models -> users FK.

### Post-drop test

- `python -m compileall app tests`: passed
- `PYTHONPATH=. pytest -q`: `64 passed, 374 warnings in 11.50s`

### Rollback verification

Rollback SQL restored the target ai_models -> users FK:

- `ai_models.owner_user_id -> users.id` / `ai_models_ibfk_1`

### Post-rollback test

- `python -m compileall app tests`: passed
- `PYTHONPATH=. pytest -q`: passed

### Result

AI models -> users FK removal dry-run passed on `staccato_test`.

This result means the target FK removal is structurally reversible and does not currently break the existing automated test suite.

This does not approve production execution by itself. Production migration still requires a separate migration plan, DB backup plan, approval, and maintenance window decision.
