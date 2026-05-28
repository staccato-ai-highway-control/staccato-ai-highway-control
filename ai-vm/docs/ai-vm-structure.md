# AI-VM Structure

AI-VM은 STACCATO 프로젝트에서 CCTV 기반 객체 탐지, 이벤트 감지, 영상 처리, Flask relay 연동을 담당하는 서버입니다.

## 구성

- ai-server
  - CCTV 소스 관리
  - 객체 탐지 및 이벤트 감지
  - ROI / 차선 기반 분석
  - 이벤트 클립 및 미디어 처리
  - Flask 서버로 탐지 이벤트 전달

## 통신 흐름

Frontend
→ Flask API Gateway
→ AI-VM ai-server
→ Flask event relay
→ DB 저장 및 관제 화면 표시

## MVP 범위

현재 MVP에서는 AI 객체 탐지와 CCTV/ITS 연동에 집중합니다.
