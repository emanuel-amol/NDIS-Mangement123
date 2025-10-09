# create_ai_tables.py - Create missing AI-related tables
import sys
sys.path.insert(0, '.')

from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from datetime import datetime

# Database connection
DATABASE_URL = "sqlite:///./ndis.db"
engine = create_engine(DATABASE_URL)
metadata = MetaData()

print("=" * 80)
print("CREATING AI-RELATED TABLES")
print("=" * 80)

# Create ai_suggestions table
ai_suggestions = Table(
    'ai_suggestions',
    metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('subject_type', String(32), nullable=False, default='participant'),
    Column('subject_id', Integer, nullable=False, index=True),
    Column('suggestion_type', String(32), nullable=False),
    Column('payload', Text),  # Will store JSON as text in SQLite
    Column('raw_text', Text),
    Column('provider', String(32)),
    Column('model', String(128)),
    Column('confidence', String(16)),
    Column('created_by', String(128)),
    Column('created_at', DateTime, server_default=func.now()),
    Column('applied', Boolean, default=False),
    Column('applied_by', String(128)),
    Column('applied_at', DateTime)
)

# Create ai_documents table
ai_documents = Table(
    'ai_documents',
    metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('participant_id', Integer, index=True, nullable=False),
    Column('referral_id', Integer, index=True),
    Column('document_id', Integer, index=True),
    Column('cos_key', String, nullable=False),
    Column('doc_type', String),
    Column('token_count', Integer, default=0),
    Column('processed_at', DateTime, default=datetime.utcnow),
    Column('meta', Text)  # JSON as text in SQLite
)

# Create ai_chunks table
ai_chunks = Table(
    'ai_chunks',
    metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('ai_document_id', Integer, nullable=False),
    Column('chunk_index', Integer, nullable=False),
    Column('text', Text, nullable=False),
    Column('meta', Text),  # JSON as text
    Column('embedding', Text)
)

# Create ai_careplan_drafts table
ai_careplan_drafts = Table(
    'ai_careplan_drafts',
    metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('participant_id', Integer, index=True, nullable=False),
    Column('draft_json', Text),  # JSON as text
    Column('source_ids', Text),  # JSON array as text
    Column('created_at', DateTime, default=datetime.utcnow)
)

# Create ai_risk_drafts table
ai_risk_drafts = Table(
    'ai_risk_drafts',
    metadata,
    Column('id', Integer, primary_key=True, index=True),
    Column('participant_id', Integer, index=True, nullable=False),
    Column('draft_json', Text),  # JSON as text
    Column('source_ids', Text),  # JSON array as text
    Column('created_at', DateTime, default=datetime.utcnow)
)

# Create all tables
try:
    print("\nCreating tables...")
    metadata.create_all(engine)
    print("\n✅ Successfully created all AI tables:")
    print("   - ai_suggestions")
    print("   - ai_documents")
    print("   - ai_chunks")
    print("   - ai_careplan_drafts")
    print("   - ai_risk_drafts")
    
    # Verify tables were created
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print("\n📋 All tables in database:")
    for table in sorted(tables):
        print(f"   - {table}")
    
    print("\n" + "=" * 80)
    print("✅ DATABASE SETUP COMPLETE")
    print("=" * 80)
    print("\nYou can now use the AI")