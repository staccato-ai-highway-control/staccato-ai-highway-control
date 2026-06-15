"""통합 테스트 데이터베이스를 안전하게 비우는 공통 도우미.

테스트 전용 데이터베이스인지 확인한 뒤 외래 키 순서를 고려해 격리 상태를 복구한다."""

# 설명: sqlalchemy에서 inspect, text 이름을 가져와 아래 로직에서 재사용한다.
from sqlalchemy import inspect, text


# 설명: `assert_test_database` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def assert_test_database(db):
    # 설명: `database`에 `db.session.execute(text('SELECT DATABASE()')).scalar` 호출 결과를 저장해 다음 처리에서 사용한다.
    database = db.session.execute(text("SELECT DATABASE()")).scalar()
    # 설명: `current_user`에 `db.session.execute(text('SELECT CURRENT_USER()')).scalar` 호출 결과를 저장해 다음 처리에서 사용한다.
    current_user = db.session.execute(text("SELECT CURRENT_USER()")).scalar()

    # 설명: `database != 'staccato_test'` 조건 결과에 따라 실행 경로를 분기한다.
    if database != "staccato_test":
        # 설명: 현재 처리를 중단하고 RuntimeError(f'Refusing to cleanup non-test database. DATABASE={database!r}')를 호출자에게 전달한다.
        raise RuntimeError(
            f"Refusing to cleanup non-test database. DATABASE={database!r}"
        )

    # 설명: `not str(current_user).startswith('staccato_test_runner@')` 조건 결과에 따라 실행 경로를 분기한다.
    if not str(current_user).startswith("staccato_test_runner@"):
        # 설명: 현재 처리를 중단하고 RuntimeError(f'Refusing to cleanup with non-test user. CURRENT_USER={current_us...를 호출자에게 전달한다.
        raise RuntimeError(
            f"Refusing to cleanup with non-test user. CURRENT_USER={current_user!r}"
        )


# 설명: `cleanup_database` 함수는 캡슐화된 처리 절차를 수행하는 함수다.
def cleanup_database(db):
    """
    Safe test cleanup.

    - Never drops tables.
    - Only deletes rows from staccato_test.
    - Requires staccato_test_runner user.
    """
    # 설명: `assert_test_database`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
    assert_test_database(db)

    # 설명: `inspector`에 `inspect` 호출 결과를 저장해 다음 처리에서 사용한다.
    inspector = inspect(db.engine)
    # 설명: `existing_tables`에 `set` 호출 결과를 저장해 다음 처리에서 사용한다.
    existing_tables = set(inspector.get_table_names())

    # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
    try:
        # 설명: `db.session.execute`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=0"))

        # 설명: `reversed(db.metadata.sorted_tables)`의 각 항목을 `table`로 받아 반복 처리한다.
        for table in reversed(db.metadata.sorted_tables):
            # 설명: `table.name in existing_tables` 조건 결과에 따라 실행 경로를 분기한다.
            if table.name in existing_tables:
                # 설명: `db.session.execute`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
                db.session.execute(table.delete())

        # 설명: `db.session.execute`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
        db.session.commit()

    except Exception:
        # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
        db.session.rollback()
        # 설명: 실패 가능성이 있는 작업을 실행하고 아래 예외 처리에서 오류 응답이나 정리를 담당한다.
        try:
            # 설명: `db.session.execute`를 호출해 필요한 부수 효과 또는 후속 처리를 수행한다.
            db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            # 설명: 현재 DB 트랜잭션의 INSERT/UPDATE/DELETE 변경을 영구 확정한다.
            db.session.commit()
        except Exception:
            # 설명: 현재 DB 트랜잭션에서 아직 확정되지 않은 변경을 모두 취소한다.
            db.session.rollback()
        # 설명: 현재 처리를 중단하고 기존 예외를 호출자에게 전달한다.
        raise
