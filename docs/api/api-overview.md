# API Overview

> Current final MVP scope: [`../mvp/final-mvp-scope.md`](../mvp/final-mvp-scope.md)

## 1. API Principle

Frontend communicates with Flask APIs.

ITS VM sends event payloads to Flask.

Flask owns DB access and API response contracts.

---

## 2. Final MVP API Domains

| Domain | Example Path | Status |
|---|---|---|
| Health | `/health` | Included |
| Auth | `/auth/signup`, `/auth/login`, `/auth/me` | Included |
| MyPage | `/auth/me/profile`, `/auth/me/password` | Included |
| Report Upload | `/api/reports` | Included |
| Incident | `/incidents`, `/incidents/{id}` | Included |
| Event Receiver | Internal ITS to Flask event endpoint | Included |
| Realtime | Socket.IO events | Included |
| Replay Metadata | Incident clip / replay metadata endpoints | Included or integrated by replay owner |

---

## 3. Excluded API Domains

| Domain | Status |
|---|---|
| Map API | Excluded from final MVP |
| GPS API | Excluded from final MVP |
| Automatic retraining API | Excluded from final MVP |


---

## 4. Auth Policy

Login succeeds only when:

    login_id + password match
    AND is_email_verified = true
    AND account_status = ACTIVE

---

## 5. Report Upload Policy

Report upload location fields are optional.

If location fields are missing or blank:

- report creation succeeds
- location row is not created
- file metadata is still stored
