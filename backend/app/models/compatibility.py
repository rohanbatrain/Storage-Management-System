from sqlalchemy.types import TypeDecorator, CHAR, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB as PG_JSONB
import uuid
import json

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    
    Uses PostgreSQL's UUID type, otherwise uses
    CHAR(32), storing as stringified hex values.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID())
        else:
            return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value)).replace('-', '')
            return value.hex

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                value = uuid.UUID(value)
            return value

class JSONCompatible(TypeDecorator):
    """Platform-independent JSON type.
    
    Uses PostgreSQL's JSONB type, otherwise uses
    universal JSON type (which allows SQLite to store as JSON).
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(JSON())

class ArrayCompatible(TypeDecorator):
    """Platform-independent Array type.
    
    Uses PostgreSQL's ARRAY type, otherwise uses
    JSON to simulate an array in SQLite.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            # This is tricky because we need the inner type for ARRAY
            # But TypeDecorator doesn't easily let us swich impl *class* 
            # dynamically to ARRAY(InnerType).
            # So for now, we will fallback to JSON for SQLite for the "aliases" field
            # and use JSONB for Postgres if we can swap it, BUT 
            # Location.aliases is ARRAY(String).
            
            # Since we are refactoring, we'll just use JSON for both to be safe and simple.
            # Postgres can store arrays in JSONB just fine.
            return dialect.type_descriptor(PG_JSONB())
        else:
            return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return value
