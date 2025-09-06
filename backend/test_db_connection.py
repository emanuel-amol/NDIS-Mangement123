import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine
from sqlalchemy import text

def test_connection():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("[SUCCESS] Database connection successful!")
            print(f"Connected to PostgreSQL database: NDIS")
            
            # Test creating a simple table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS test_connection (
                    id SERIAL PRIMARY KEY,
                    message VARCHAR(100)
                )
            """))
            conn.commit()
            print("[SUCCESS] Test table created successfully!")
            
            # Clean up test table
            conn.execute(text("DROP TABLE IF EXISTS test_connection"))
            conn.commit()
            print("[SUCCESS] Test table cleaned up!")
            
            return True
    except Exception as e:
        print(f"[ERROR] Database connection failed!")
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_connection()