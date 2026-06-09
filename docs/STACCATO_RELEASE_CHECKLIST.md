# STACCATO 최종 릴리즈 체크리스트

## 1. Backend 검증

- [x] Flask health check 통과
  - 결과: 200 OK

- [x] Flask pytest 통과
  - 결과: 100 passed, 273 warnings

## 2. Frontend / HTTPS 검증

- [x] Frontend HTTPS 접속 확인
  - 결과: 200 OK

- [x] Nginx HTTPS reverse proxy 동작 확인

## 3. Socket.IO 검증

- [x] Socket.IO polling 확인
  - 결과: 200 OK
  - sid 반환 확인

## 4. AI Media 검증

- [x] /api/events 응답의 AI media URL HTTPS 변환 확인
  - 예시: https://mbc-sw.iptime.org:3221/ai-media/events/...

- [ ] AI media Range request 확인
  - 참고: AI-vm 서비스를 의도적으로 중지한 상태에서는 502 Bad Gateway가 발생할 수 있음

## 5. AI-vm 검증

- [x] AI 정차 이벤트 소형 bbox / confidence 필터 반영
  - Commit: 2a7519e

- [x] AI-vm compileall 통과
  - 명령어: python3 -m compileall ai-vm/app/config.py ai-vm/app/event_detector.py

## 6. 최종 브라우저 QA

- [ ] 브라우저 로그인 확인
- [ ] 이벤트 목록 조회 확인
- [ ] 이벤트 상세 조회 확인
- [ ] 스냅샷 표시 확인
- [ ] 영상 재생 확인
- [ ] 영상 다운로드 확인
- [ ] 실시간 스트림 확인

## 7. 참고 사항

- 현재 시연/개발 환경은 자체서명 인증서를 사용합니다.
- AI media proxy는 AI-vm 서비스가 실행 중일 때 정상 검증 가능합니다.
- Frontend Next.js는 운영 안정화를 위해 systemd 자동기동 구성이 권장됩니다.
