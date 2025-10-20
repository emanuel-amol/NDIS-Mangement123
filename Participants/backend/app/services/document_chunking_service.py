# backend/app/services/document_chunking_service.py
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.document_chunk import DocumentChunk, DocumentProcessingJob
from ai.document_ingest import extract_text
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class DocumentChunkingService:
    """Service for chunking documents into searchable pieces"""
    
    # Chunking configuration
    CHUNK_SIZE = 500  # Characters per chunk
    CHUNK_OVERLAP = 50  # Overlap between chunks for context
    MIN_CHUNK_SIZE = 100  # Minimum viable chunk size
    
    @staticmethod
    def chunk_document(db: Session, document_id: int) -> List[DocumentChunk]:
        """
        Extract text from document and split into chunks for RAG.
        Returns list of created DocumentChunk objects.
        """
        try:
            # Get document
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise ValueError(f"Document {document_id} not found")
            
            logger.info(f"Starting chunking for document {document_id}: {document.title}")
            
            # Create processing job
            job = DocumentProcessingJob(
                document_id=document_id,
                participant_id=document.participant_id,
                job_type="chunk",
                status="processing",
                started_at=datetime.utcnow().isoformat()
            )
            db.add(job)
            db.flush()
            
            # Extract text from document
            try:
                full_text = extract_text(document)
                logger.info(f"Extracted {len(full_text)} characters from document {document_id}")
            except Exception as e:
                logger.error(f"Error extracting text from document {document_id}: {e}")
                job.status = "failed"
                job.error_message = f"Text extraction failed: {str(e)}"
                job.completed_at = datetime.utcnow().isoformat()
                db.commit()
                raise
            
            if not full_text or len(full_text.strip()) < DocumentChunkingService.MIN_CHUNK_SIZE:
                logger.warning(f"Document {document_id} has insufficient text content")
                job.status = "completed"
                job.chunks_created = 0
                job.completed_at = datetime.utcnow().isoformat()
                db.commit()
                return []
            
            # Delete existing chunks for this document (if reprocessing)
            existing_chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id
            ).delete()
            
            if existing_chunks > 0:
                logger.info(f"Deleted {existing_chunks} existing chunks for document {document_id}")
            
            # Split into chunks
            chunks = DocumentChunkingService._split_text_into_chunks(
                text=full_text,
                chunk_size=DocumentChunkingService.CHUNK_SIZE,
                overlap=DocumentChunkingService.CHUNK_OVERLAP
            )
            
            logger.info(f"Created {len(chunks)} chunks for document {document_id}")
            
            # Create DocumentChunk records
            chunk_objects = []
            for idx, chunk_text in enumerate(chunks):
                chunk_metadata = {
                    "document_title": document.title,
                    "document_category": document.category,
                    "document_type": document.mime_type,
                    "filename": document.original_filename,
                    "total_chunks": len(chunks)
                }
                
                chunk = DocumentChunk(
                    document_id=document_id,
                    participant_id=document.participant_id,
                    chunk_index=idx,
                    chunk_text=chunk_text,
                    chunk_size=len(chunk_text),
                    chunk_metadata=chunk_metadata
                )
                db.add(chunk)
                chunk_objects.append(chunk)
            
            # Update job status
            job.status = "completed"
            job.chunks_created = len(chunk_objects)
            job.completed_at = datetime.utcnow().isoformat()
            
            db.commit()
            
            logger.info(f"Successfully chunked document {document_id} into {len(chunk_objects)} chunks")
            
            return chunk_objects
            
        except Exception as e:
            logger.error(f"Error chunking document {document_id}: {e}")
            db.rollback()
            if 'job' in locals():
                job.status = "failed"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow().isoformat()
                db.commit()
            raise
    
    @staticmethod
    def _split_text_into_chunks(
        text: str, 
        chunk_size: int = 500, 
        overlap: int = 50
    ) -> List[str]:
        """
        Split text into overlapping chunks.
        Tries to split on sentence boundaries when possible.
        """
        if not text:
            return []
        
        # Clean text
        text = text.strip()
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            # Calculate end position
            end = start + chunk_size
            
            # If this is not the last chunk, try to break at sentence boundary
            if end < text_length:
                # Look for sentence endings near the chunk boundary
                search_start = max(start, end - 100)  # Look back up to 100 chars
                search_text = text[search_start:end + 50]  # Look ahead up to 50 chars
                
                # Find sentence endings (., !, ?)
                sentence_endings = [
                    i for i, char in enumerate(search_text) 
                    if char in '.!?' and i + 1 < len(search_text) and search_text[i + 1].isspace()
                ]
                
                if sentence_endings:
                    # Use the last sentence ending found
                    last_ending = sentence_endings[-1]
                    end = search_start + last_ending + 1
            
            # Extract chunk
            chunk = text[start:end].strip()
            
            if len(chunk) >= DocumentChunkingService.MIN_CHUNK_SIZE:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - overlap if end < text_length else text_length
        
        return chunks
    
    @staticmethod
    def get_document_chunks(
        db: Session, 
        document_id: int, 
        include_embeddings: bool = False
    ) -> List[DocumentChunk]:
        """Get all chunks for a document"""
        query = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).order_by(DocumentChunk.chunk_index)
        
        return query.all()
    
    @staticmethod
    def get_participant_chunks(
        db: Session, 
        participant_id: int,
        document_id: Optional[int] = None
    ) -> List[DocumentChunk]:
        """Get all chunks for a participant (optionally filtered by document)"""
        query = db.query(DocumentChunk).filter(
            DocumentChunk.participant_id == participant_id
        )
        
        if document_id:
            query = query.filter(DocumentChunk.document_id == document_id)
        
        return query.order_by(
            DocumentChunk.document_id, 
            DocumentChunk.chunk_index
        ).all()
    
    @staticmethod
    def get_processing_status(db: Session, document_id: int) -> Optional[Dict[str, Any]]:
        """Get processing status for a document"""
        job = db.query(DocumentProcessingJob).filter(
            DocumentProcessingJob.document_id == document_id
        ).order_by(DocumentProcessingJob.created_at.desc()).first()
        
        if not job:
            return None
        
        return {
            "job_id": job.id,
            "status": job.status,
            "job_type": job.job_type,
            "chunks_created": job.chunks_created,
            "chunks_embedded": job.chunks_embedded,
            "error_message": job.error_message,
            "started_at": job.started_at,
            "completed_at": job.completed_at
        }