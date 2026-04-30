# STACCATO MVP 파일 저장 정책

## 1. 기본 원칙

STACCATO는 이미지, 영상, 모델, 데이터셋, 학습 로그 같은 대용량 파일을 DB에 직접 저장하지 않는다.

DB에는 파일의 경로와 메타데이터만 저장한다.

## 2. 저장 위치

Docker Volume 또는 프로젝트 storage 디렉터리를 사용한다.

storage/
- uploads/
- snapshots/
- thumbnails/
- models/
- datasets/
- training-logs/

## 3. 디렉터리 역할

| 경로 | 역할 |
|---|---|
| storage/uploads | 사용자가 업로드한 이미지/영상 |
| storage/snapshots | AI 탐지 순간 캡처 이미지 |
| storage/thumbnails | 목록 표시용 썸네일 |
| storage/models | AI 모델 파일 |
| storage/datasets | 재학습 데이터셋 |
| storage/training-logs | 학습 로그 |

## 4. DB 저장 방식

DB에는 다음 정보만 저장한다.

| 필드 | 설명 |
|---|---|
| file_path | 실제 파일 저장 경로 |
| thumbnail_path | 썸네일 경로 |
| file_size | 파일 크기 |
| mime_type | 파일 타입 |
| original_filename | 원본 파일명 |
| created_at | 생성 시각 |

## 5. Git 관리 기준

storage 내부 실제 파일은 Git에 올리지 않는다.

허용:
- storage/uploads/.gitkeep
- storage/snapshots/.gitkeep
- storage/thumbnails/.gitkeep
- storage/models/.gitkeep
- storage/datasets/.gitkeep
- storage/training-logs/.gitkeep

금지:
- storage/uploads/*
- storage/snapshots/*
- storage/thumbnails/*
- storage/models/*
- storage/datasets/*
- storage/training-logs/*

## 6. 파일명 정책

파일명은 충돌 방지를 위해 UUID 기반으로 생성한다.

예시:
incident_20260430_143000_550e8400_snapshot.jpg

## 7. 보안 기준

- 사용자 업로드 파일 확장자를 검증한다.
- 실행 가능한 파일 업로드를 제한한다.
- 원본 파일명은 DB에 보관하되 실제 저장명은 UUID 기반으로 변경한다.
- 외부 공개 URL은 Flask Server를 통해 권한 확인 후 제공한다.

## 8. MVP 범위

MVP에서는 로컬 Docker Volume 기반 저장을 사용한다.  
S3, Object Storage, CDN은 고도화 단계에서 검토한다.
