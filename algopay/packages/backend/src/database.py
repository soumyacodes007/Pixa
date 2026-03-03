"""
Database configuration and models for Algopay
Uses SQLAlchemy with async PostgreSQL
"""
import os
from datetime import datetime, timezone
from typing import AsyncGenerator

from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://algopay:algopay@localhost:5432/algopay"
)

# Create async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True,  # Log SQL queries (disable in production)
    future=True
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base class for models
Base = declarative_base()


# Models
class AuthFlow(Base):
    """
    Authentication flow tracking
    Stores OTP flows with expiry and attempt limits
    """
    __tablename__ = "auth_flows"

    flow_id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), nullable=False, index=True)
    network = Column(String(20), nullable=False, default="testnet")
    otp_hash = Column(String(255), nullable=False)  # Bcrypt hash of OTP
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified = Column(Boolean, nullable=False, default=False)
    attempts = Column(Integer, nullable=False, default=0)
    max_attempts = Column(Integer, nullable=False, default=3)


class User(Base):
    """
    User accounts
    Maps email to wallet address
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    wallet_address = Column(String(58), nullable=False)  # Algorand address
    network = Column(String(20), nullable=False, default="testnet")
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime(timezone=True), nullable=True)


# Dependency to get database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session
    Usage: db: AsyncSession = Depends(get_db)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Database initialization
async def init_db():
    """
    Initialize database tables
    Call this on application startup
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """
    Close database connections
    Call this on application shutdown
    """
    await engine.dispose()
