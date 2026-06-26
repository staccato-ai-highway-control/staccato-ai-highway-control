from sqlalchemy import inspect, text


def assert_test_database(db):
    database = db.session.execute(text("SELECT DATABASE()")).scalar()
    current_user = db.session.execute(text("SELECT CURRENT_USER()")).scalar()

    if database != "staccato_test":
        raise RuntimeError(
            f"Refusing to cleanup non-test database. DATABASE={database!r}"
        )

    if not str(current_user).startswith("staccato_test_runner@"):
        raise RuntimeError(
            f"Refusing to cleanup with non-test user. CURRENT_USER={current_user!r}"
        )


def cleanup_database(db):
    """
    Safe test cleanup.

    - Never drops tables.
    - Only deletes rows from staccato_test.
    - Requires staccato_test_runner user.
    """
    assert_test_database(db)

    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())

    try:
        db.session.execute(text("SET FOREIGN_KEY_CHECKS=0"))

        for table in reversed(db.metadata.sorted_tables):
            if table.name in existing_tables:
                db.session.execute(table.delete())

        db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.session.commit()

    except Exception:
        db.session.rollback()
        try:
            db.session.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        raise
