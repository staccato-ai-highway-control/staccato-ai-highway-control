# AI-vm 서비스 제어 명령어

AI-vm FastAPI 서버는 `staccato-ai-server.service` systemd 서비스로 관리합니다.

## 설치

AI-vm에서 repository 최신 develop을 받은 뒤 실행합니다.

### 현재 사용자만 사용

```bash
cd /home/staccato/staccato
bash ai-vm/scripts/install-ai-control-commands.sh --user
source ~/.bashrc
```

### 모든 사용자 공용 설치

```bash
cd /home/staccato/staccato
bash ai-vm/scripts/install-ai-control-commands.sh --system
```

## 사용법

### AI-vm 켜기

```bash
ai-on
```

### AI-vm 끄기

```bash
ai-off
```

### 상태 확인

```bash
ai-status
```

### 최근 로그 확인

```bash
ai-log
```

## 다른 VM에서 원격 실행

사용자 설치 방식인 경우:

```bash
ssh staccato@192.168.0.186 '~/bin/ai-on'
ssh staccato@192.168.0.186 '~/bin/ai-off'
ssh staccato@192.168.0.186 '~/bin/ai-status'
ssh staccato@192.168.0.186 '~/bin/ai-log'
```

system-wide 설치 방식인 경우:

```bash
ssh staccato@192.168.0.186 ai-on
ssh staccato@192.168.0.186 ai-off
ssh staccato@192.168.0.186 ai-status
ssh staccato@192.168.0.186 ai-log
```

## 주의사항

- 이 명령어들은 `systemctl enable`을 수행하지 않습니다.
- AI-vm은 테스트할 때만 켜고, 사용 후 `ai-off`로 종료합니다.
- VM 재부팅 시 자동 시작되지 않습니다.
