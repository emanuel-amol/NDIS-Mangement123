"""
Create tables for RAG (Retrieval Augmented Generation) system.
Run this script to set up document chunking and embeddings.
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print(" DATABASE_URL not set in environment")
    exit(1)

engine = create_engine(DATABASE_URL)

# SQL to create tables
CREATE_TABLES_SQL = """
-- Document Chunks Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id),
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_size INTEGER NOT NULL,
    page_number INTEGER,
    start_char INTEGER,
    end_char INTEGER,
    embedding_vector JSON,
    embedding_model VARCHAR(100),
    chunk_metadata JSON DEFAULT '{}',
    created_at VARCHAR(50) DEFAULT (NOW()::TEXT),
    updated_at VARCHAR(50)
);

-- Indexes for document_chunks
CREATE INDEX IF NOT EXISTS ix_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_participant_id ON document_chunks(participant_id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_doc_participant ON document_chunks(document_id, participant_id);
CREATE INDEX IF NOT EXISTS ix_document_chunks_participant_created ON document_chunks(participant_id, created_at);

-- Document Processing Jobs Table
CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    participant_id INTEGER NOT NULL REFERENCES participants(id),
    job_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    chunks_created INTEGER DEFAULT 0,
    chunks_embedded INTEGER DEFAULT 0,
    error_message TEXT,
    processing_metadata JSON DEFAULT '{}',
    started_at VARCHAR(50),
    completed_at VARCHAR(50),
    created_at VARCHAR(50) DEFAULT (NOW()::TEXT)
);

-- Indexes for document_processing_jobs
CREATE INDEX IF NOT EXISTS ix_document_processing_jobs_document_id ON document_processing_jobs(document_id);
CREATE INDEX IF NOT EXISTS ix_document_processing_jobs_status ON document_processing_jobs(status);
"""

def create_rag_tables():
    """Create RAG tables in database"""
    try:
        print(" Creating RAG tables...")
        
        with engine.connect() as conn:
            # Execute SQL
            conn.execute(text(CREATE_TABLES_SQL))
            conn.commit()
        
        print(" Successfully created RAG tables:")
        print("   - document_chunks")
        print("   - document_processing_jobs")
        print("\n RAG system is ready!")
        print("\n Next steps:")
        print("   1. Restart your backend: python main.py")
        print("   2. Upload documents via /api/v1/participants/{id}/documents")
        print("   3. Documents will auto-process for RAG")
        print("   4. Use RAG-enhanced AI via /api/v1/participants/{id}/ai/care-plan/suggest-with-context")
        
    except Exception as e:
        print(f" Error creating RAG tables: {e}")
        raise

if __name__ == "__main__":
    create_rag_tables()
