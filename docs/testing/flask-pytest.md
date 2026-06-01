# Flask pytest 실행 가이드

## 1. 개요

Flask 테스트 중 일부는 MySQL 기반 격리 테스트 DB를 필요로 합니다.

`TEST_DATABASE_URL`이 설정되지 않으면 전체 pytest 실행 시 애플리케이션 로직에 도달하기 전에 테스트 환경 오류가 발생할 수 있습니다.

현재 테스트는 안전장치로 다음 조건을 요구합니다.

- 테스트 DB 이름에 `staccato_test`가 포함되어야 함
- 일부 테스트와 DB cleanup 유틸은 `staccato_test_runner` 계정을 요구함
- 운영 DB `staccato`를 테스트 대상으로 사용하면 안 됨

## 2. 테스트 DB 요구사항

테스트용 DB는 운영 DB와 분리합니다.

권장 DB 이름:

`staccato_test`

권장 테스트 계정:

`staccato_test_runner`

## 3. DB-vm에서 테스트 DB와 계정 생성

DB-vm에서 관리자 권한으로 실행합니다.

    sudo mysql

MySQL 프롬프트에서 아래 SQL을 실행합니다.

    CREATE DATABASE IF NOT EXISTS staccato_test
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

    CREATE USER IF NOT EXISTS 'staccato_test_runner'@'192.168.0.187'
    IDENTIFIED BY '<TEST_DB_PASSWORD>';

    GRANT ALL PRIVILEGES ON staccato_test.* TO 'staccato_test_runner'@'192.168.0.187';

    FLUSH PRIVILEGES;

`<TEST_DB_PASSWORD>`는 Git에 기록하지 않습니다.

## 4. FLASK-vm에서 환경변수 설정

FLASK-vm에서 실행합니다.

    cd /home/staccato/staccato/flask-vm

    export TEST_DATABASE_URL="mysql+pymysql://staccato_test_runner:<TEST_DB_PASSWORD>@192.168.0.190:3306/staccato_test?charset=utf8mb4"

주의사항:

- `<TEST_DB_PASSWORD>`는 실제 테스트 DB 계정 비밀번호로 교체합니다.
- `.env`, 실제 비밀번호, 개인 접속 정보는 Git에 커밋하지 않습니다.

## 5. 테스트 실행

전체 테스트:

    cd /home/staccato/staccato/flask-vm

    .venv/bin/python -m pytest -q

특정 테스트만 실행:

    .venv/bin/python -m pytest tests/test_incident_unit.py -q

## 6. 자주 발생하는 오류

### TEST_DATABASE_URL 미설정

오류 예시:

    TEST_DATABASE_URL is required for MySQL-isolated tests.

해결:

    export TEST_DATABASE_URL="mysql+pymysql://staccato_test_runner:<TEST_DB_PASSWORD>@192.168.0.190:3306/staccato_test?charset=utf8mb4"

### 운영 DB 사용 방지 오류

오류 예시:

    Refusing to run tests outside staccato_test database.

해결:

- `TEST_DATABASE_URL`이 운영 DB `staccato`를 바라보지 않는지 확인합니다.
- DB 이름이 `staccato_test`인지 확인합니다.

### 테스트 전용 계정 오류

오류 예시:

    TEST_DATABASE_URL must use staccato_test_runner.

해결:

- `TEST_DATABASE_URL`의 사용자 계정을 `staccato_test_runner`로 설정합니다.

### DB 권한 오류

오류 예시:

    Access denied for user 'staccato_test_runner'@'192.168.0.187'

해결:

DB-vm에서 권한을 다시 부여합니다.

    GRANT ALL PRIVILEGES ON staccato_test.* TO 'staccato_test_runner'@'192.168.0.187';
    FLUSH PRIVILEGES;

## 7. 운영 DB 보호 원칙

pytest는 절대 운영 DB `staccato`를 대상으로 실행하지 않습니다.

테스트 실행 전 아래 조건을 확인합니다.

- DB name: `staccato_test`
- DB user: `staccato_test_runner`

이 조건을 만족하지 않으면 테스트를 실행하지 않습니다.
