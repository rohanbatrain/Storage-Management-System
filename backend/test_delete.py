import sys
import os
import logging

# Add the project root to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.location import Location, LocationKind
from app.models.item import Item
import app.models.item_embedding
from app.routers.locations import delete_location

# Enable SQLAlchemy SQL logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

def run():
    db = SessionLocal()
    # Create location
    loc = Location(name="Test Loc", kind=LocationKind.ROOM)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    print(f"Created location: {loc.id}")
    
    # Try delete
    try:
        delete_location(loc.id, db)
        print("Delete function finished")
    except Exception as e:
        print(f"Delete failed: {e}")
        
    # Verify
    deleted_loc = db.query(Location).filter(Location.id == loc.id).first()
    if deleted_loc:
        print("FAIL: Location still in DB!")
    else:
        print("SUCCESS: Location deleted")

if __name__ == "__main__":
    run()
