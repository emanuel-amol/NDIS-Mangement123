# app/tasks/ingest_tasks.py
from sqlalchemy.orm import Session
from app.services.ingest.extract_text import extract_and_chunk
from app.models.ai import AIDocument, AIChunk
from typing import List
import logging

logger = logging.getLogger(__name__)

def ingest_participant_documents(db: Session, participant_id: int, cos_keys: List[str]):
    """
    Ingest participant documents for AI processing.
    
    Args:
        db: Database session
        participant_id: ID of the participant
        cos_keys: List of COS keys for documents to ingest
    """
    try:
        for key in cos_keys:
            # Create AI document record
            doc = AIDocument(
                participant_id=participant_id, 
                cos_key=key,
                doc_type=determine_doc_type(key)
            )
            db.add(doc)
            db.flush()
            
            # Extract and chunk text
            chunks = extract_and_chunk(key)
            
            # Store chunks
            for i, chunk_data in enumerate(chunks):
                chunk = AIChunk(
                    ai_document_id=doc.id,
                    chunk_index=i,
                    text=chunk_data["text"],
                    meta=chunk_data.get("meta", {})
                )
                db.add(chunk)
            
            # Update token count (approximate)
            doc.token_count = sum(len(c["text"].split()) for c in chunks)
            
            logger.info(f"Ingested document {key} with {len(chunks)} chunks for participant {participant_id}")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"Error ingesting documents for participant {participant_id}: {e}")
        db.rollback()
        raise

def determine_doc_type(cos_key: str) -> str:
    """Determine document type from COS key"""
    key_lower = cos_key.lower()
    
    if 'referral' in key_lower:
        return 'referral'
    elif 'medical' in key_lower or 'health' in key_lower:
        return 'medical'
    elif 'assessment' in key_lower or 'report' in key_lower:
        return 'assessment'
    elif 'note' in key_lower:
        return 'notes'
    else:
        return 'general'
