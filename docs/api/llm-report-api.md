# Deprecated Notice

> This document describes an earlier LLM / chatbot / LLM report architecture.
> LLM, chatbot, and LLM report generation are excluded from the final STACCATO MVP scope.
> For the current final scope, see `docs/mvp/final-mvp-scope.md`.

---

\# LLM Report API



\## 목적



Incident 기반 Mock LLM 보고서 생성 API의 기본 계약을 정의한다.



초기 버전에서는 실제 LLM API를 호출하지 않고, 사건 정보, 탐지 로그, 사건 메모를 기반으로 Mock 보고서를 생성한다.



\## API 목록



| Method | Endpoint | Description |

|---|---|---|

| POST | /incidents/{id}/llm-reports | 사건 기반 LLM 보고서 생성 |

| GET | /incidents/{id}/llm-reports | 사건별 LLM 보고서 목록 조회 |

| GET | /llm-reports/{id} | LLM 보고서 단건 조회 |

| PATCH | /llm-reports/{id}/status | LLM 보고서 상태 변경 |

| DELETE | /llm-reports/{id} | LLM 보고서 삭제성 처리 |



\## 생성 흐름



Incident → Detection Logs → Incident Memos → Mock LLM Report → llm\_reports 저장



\## 역할 분리



| Layer | Responsibility |

|---|---|

| routes/llm\_report\_routes.py | HTTP 요청/응답 처리 |

| services/llm\_report\_service.py | 보고서 생성, 조회, 상태 변경 비즈니스 로직 |

| clients/llm\_client.py | Mock LLM 보고서 생성 함수 |



\## 후속 작업



| 작업 | 설명 |

|---|---|

| 보고서 생성 구현 | incident, detection\_logs, memos 조회 후 llm\_reports 저장 |

| 보고서 조회 구현 | 사건별 목록 및 단건 조회 |

| 상태 변경 구현 | 보고서 상태 변경 |

| 삭제성 처리 구현 | 실제 삭제가 아닌 상태 기반 삭제 |

| Mock 보고서 고도화 | 위험도, 탐지 근거, 조치 권고 내용 생성 |

