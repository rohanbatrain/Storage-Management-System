import os
import sys

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text
from app.database import engine

def add_column():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE locations ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);"))
        conn.commit()
    print("Column image_url added to locations table.")

if __name__ == "__main__":
    add_column()
