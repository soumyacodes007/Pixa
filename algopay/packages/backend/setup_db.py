"""
Database setup script
Run this to initialize the database tables
"""
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database import init_db, close_db


async def setup():
    """Initialize database tables"""
    print("Initializing database...")
    try:
        await init_db()
        print("✓ Database tables created successfully")
    except Exception as e:
        print(f"✗ Database initialization failed: {e}")
        sys.exit(1)
    finally:
        await close_db()
        print("✓ Database connections closed")


if __name__ == "__main__":
    asyncio.run(setup())
