from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from config import settings

_timeout = {"timeout": 5} if "pg8000" in settings.database_url else {"connect_timeout": 5}
engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args=_timeout)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    import models  # noqa: F401  (registers tables)

    try:
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except OperationalError as e:
        raise RuntimeError(
            "Cannot reach PostgreSQL on localhost:5433. Start Docker Desktop, then run: docker compose up -d"
        ) from e
    Base.metadata.create_all(engine)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
