from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from .models import entities  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_pet_columns()


def _ensure_sqlite_pet_columns() -> None:
    if not settings.database_url.startswith("sqlite"):
        return

    required_columns = {
        "gender": "ALTER TABLE pets ADD COLUMN gender VARCHAR(20) NOT NULL DEFAULT 'male'",
        "appearance_style": "ALTER TABLE pets ADD COLUMN appearance_style VARCHAR(30) NOT NULL DEFAULT 'classic'",
    }

    with engine.begin() as connection:
        columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(pets)")
        }
        for column_name, ddl in required_columns.items():
            if column_name not in columns:
                connection.exec_driver_sql(ddl)
