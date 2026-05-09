> Legacy Notice  
> 이 문서는 초기 로컬/통합 개발 환경 기준을 포함할 수 있습니다.  
> 현재 공식 실행 기준은 VM 분리 구조이며, 서버별 실행 기준은 `docs/infra/server-folder-map.md`와 `docs/infra/vm-server-status.md`를 우선 참고합니다.

- STACCATO 5개 서버 구조
- Frontend / Flask / AI / ITS / DB 역할
- LLM은 Flask 내부 모듈
- Flask만 DB 직접 접근
- AI 서버는 분석 결과만 Flask로 반환
- ITS 서버는 위험도 보조 데이터 제공
- Socket.IO는 Flask 내부, 이벤트/상태만 전송
- 파일은 DB 저장 금지, Docker Volume 저장