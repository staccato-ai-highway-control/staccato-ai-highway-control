# STACCATO MVP Feature Scope

> Current final MVP scope: [`final-mvp-scope.md`](./final-mvp-scope.md)

## 1. MVP Goal

STACCATO final MVP provides an AI-based highway CCTV abnormal situation detection and monitoring workflow.

The MVP is designed to demonstrate:

- vehicle detection
- object tracking
- abnormal situation event generation
- realtime notification
- incident review
- report upload
- user authentication
- mypage management

---

## 2. Included Features

| Domain | Included Feature |
|---|---|
| AI Detection | YOLOv11 vehicle detection |
| AI Comparison | RT-DETR comparison experiment |
| Tracking | ByteTrack based vehicle tracking |
| Event Detection | ROI / Rule Engine based stop, low-speed, shoulder-event judgment |
| Realtime | Socket.IO based event notification |
| Incident | Incident list/detail metadata |
| Replay | Snapshot / MP4 replay metadata |
| Report Upload | User report upload with optional location fields |
| Auth | Signup, email verification, admin approval, login |
| MyPage | Profile update, password change, account status policy |
| DB | MySQL metadata persistence |

---

## 3. Excluded Features

| Feature | Status |
|---|---|
| LLM report generation | Excluded |
| LLM chatbot | Excluded |
| LLM filter | Excluded |
| Map API | Excluded |
| GPS-based location display | Excluded |
| Role-based frontend screen split | Excluded from MVP demo |
| Reinforcement learning | Excluded |
| Automatic retraining pipeline | Excluded |
| Full Docker Compose deployment | Excluded from current VM runtime |

---

## 4. User-Scope Backend Features

The following areas are user-scope backend responsibilities:

- DB-related model consistency
- signup / email verification / login policy
- mypage profile and account policy
- report upload backend
- optional report location handling
- regression test coverage for the above areas

Current expected user-scope regression test result:

    24 passed

---

## 5. Report Upload Policy

Report upload location fields are optional.

| Field | Policy |
|---|---|
| location | optional |
| latitude | optional |
| longitude | optional |

If location fields are missing or blank:

- report creation succeeds
- ReportLocation row is not created
- uploaded file metadata is still stored

Invalid coordinate strings should be rejected.

---

## 6. Auth Policy Summary

Login is allowed only when:

    login_id + password match
    AND is_email_verified = true
    AND account_status = ACTIVE

The following users must not be able to login:

- email-unverified users
- PENDING users
- inactive or withdrawn users

---

## 7. AI Model Scope

YOLOv11 is the main detection model for final MVP.

RT-DETR is used as a comparison model.

Keras is optional and may be used later as:

- crop classification baseline
- experimental detector prototype
