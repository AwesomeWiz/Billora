
# backend/app/core/db.py

from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import settings


# Async engine for SQLite using the aiosqlite driver
engine = create_async_engine(
    settings.sqlite_url,
    connect_args={"check_same_thread": False},
    echo=False,
)


# Apply SQLite pragmas whenever a new database connection is created
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA busy_timeout=5000;")
    finally:
        cursor.close()


# Async database session factory
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


# Declarative base for SQLAlchemy models
Base = declarative_base()
