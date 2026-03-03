"""
Test database connection and initialization
Run this to verify PostgreSQL is working correctly
"""
import asyncio
import sys
from sqlalchemy import text

from src.database import engine, init_db, close_db, AsyncSessionLocal


async def test_connection():
    """Test database connection and table creation"""
    print("Testing database connection...")
    
    try:
        # Test basic connection
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✓ Connected to PostgreSQL: {version}")
        
        # Initialize database tables
        print("\nInitializing database tables...")
        await init_db()
        print("✓ Database tables created successfully")
        
        # Test table creation
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)
            )
            tables = [row[0] for row in result.fetchall()]
            print(f"\n✓ Tables created: {', '.join(tables)}")
            
            # Verify expected tables exist
            expected_tables = ['auth_flows', 'users']
            for table in expected_tables:
                if table in tables:
                    print(f"  ✓ {table}")
                else:
                    print(f"  ✗ {table} (missing)")
        
        print("\n✓ Database connection test passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Database connection test failed: {e}")
        print("\nTroubleshooting:")
        print("1. Ensure PostgreSQL is running:")
        print("   docker-compose -f docker-compose.db.yml up -d")
        print("2. Check database logs:")
        print("   docker logs algopay-postgres")
        print("3. Verify DATABASE_URL in .env file")
        return False
    
    finally:
        await close_db()


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
