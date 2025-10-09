# backend/app/api/v1/endpoints/document_rag.py
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.document import Document
from app.models.participant import Participant
from app.services.document_chunking_service import DocumentChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.rag_service import RAGService
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import logging

router = APIRouter(prefix="/documents", tags=["document-rag"])
logger = logging.getLogger(__name__)

# Pydantic models
class DocumentProcessRequest(BaseModel):
    document_id: int
    force_reprocess: bool = False

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5
    similarity_threshold: float = 0.5

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[Dict[str, Any]]
    search_type: str

# Background task functions
def process_document_background(document_id: int, db: Session):
    """Background task to chunk and embed a document"""
    try:
        # Chunk document
        chunks = DocumentChunkingService.chunk_document(db, document_id)
        logger.info(f"Created {len(chunks)} chunks for document {document_id}")
        
        # Embed chunks
        embedding_service = EmbeddingService()
        if embedding_service.embeddings_available:
            embedded = embedding_service.embed_document_chunks(db, document_id)
            logger.info(f"Embedded {embedded} chunks for document {document_id}")
        else:
            logger.info(f"Embeddings not available - chunks created without embeddings")
            
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {e}")


# Endpoints
@router.post("/process")
def process_document(
    request: DocumentProcessRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Process a document: extract text, chunk, and generate embeddings.
    Processing happens in background.
    """
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == request.document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check if already processed
        status = DocumentChunkingService.get_processing_status(db, request.document_id)
        
        if status and status["status"] == "processing":
            return {
                "message": "Document is already being processed",
                "document_id": request.document_id,
                "status": status
            }
        
        if status and status["status"] == "completed" and not request.force_reprocess:
            return {
                "message": "Document already processed",
                "document_id": request.document_id,
                "chunks_created": status["chunks_created"],
                "chunks_embedded": status["chunks_embedded"],
                "status": status
            }
        
        # Add background task
        background_tasks.add_task(process_document_background, request.document_id, db)
        
        return {
            "message": "Document processing started",
            "document_id": request.document_id,
            "status": "processing"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting document processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/processing-status")
def get_processing_status(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get processing status for a document"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        status = DocumentChunkingService.get_processing_status(db, document_id)
        
        if not status:
            return {
                "document_id": document_id,
                "status": "not_processed",
                "message": "Document has not been processed yet"
            }
        
        # Get chunk count
        from app.models.document_chunk import DocumentChunk
        chunk_count = db.query(DocumentChunk).filter(
            DocumentChunk.document_id == document_id
        ).count()
        
        return {
            "document_id": document_id,
            "chunk_count": chunk_count,
            **status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting processing status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{document_id}/chunks")
def get_document_chunks(
    document_id: int,
    include_embeddings: bool = False,
    db: Session = Depends(get_db)
):
    """Get all chunks for a document"""
    try:
        # Verify document exists
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        chunks = DocumentChunkingService.get_document_chunks(db, document_id, include_embeddings)
        
        return {
            "document_id": document_id,
            "total_chunks": len(chunks),
            "chunks": [
                {
                    "id": chunk.id,
                    "chunk_index": chunk.chunk_index,
                    "chunk_text": chunk.chunk_text,
                    "chunk_size": chunk.chunk_size,
                    "has_embedding": chunk.embedding_vector is not None,
                    "embedding_vector": chunk.embedding_vector if include_embeddings else None,
                    "metadata": chunk.chunk_metadata
                }
                for chunk in chunks
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document chunks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/participants/{participant_id}/search")
def search_participant_documents(
    participant_id: int,
    request: SearchRequest,
    db: Session = Depends(get_db)
) -> SearchResponse:
    """Search participant's documents using semantic or keyword search"""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Search documents
        rag_service = RAGService()
        results = rag_service.search_participant_documents(
            db=db,
            participant_id=participant_id,
            query=request.query,
            top_k=request.top_k,
            similarity_threshold=request.similarity_threshold
        )
        
        search_type = "semantic" if results and results[0].get("search_type") == "semantic" else "keyword"
        
        return SearchResponse(
            query=request.query,
            total_results=len(results),
            results=results,
            search_type=search_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/participants/{participant_id}/batch-process")
def batch_process_participant_documents(
    participant_id: int,
    background_tasks: BackgroundTasks,
    force_reprocess: bool = False,
    db: Session = Depends(get_db)
):
    """Process all documents for a participant"""
    try:
        # Verify participant exists
        participant = db.query(Participant).filter(Participant.id == participant_id).first()
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        
        # Get all documents
        documents = db.query(Document).filter(
            Document.participant_id == participant_id,
            Document.status == "active"
        ).all()
        
        if not documents:
            return {
                "message": "No documents found for participant",
                "participant_id": participant_id,
                "documents_found": 0
            }
        
        # Add processing tasks for each document
        for document in documents:
            background_tasks.add_task(process_document_background, document.id, db)
        
        return {
            "message": f"Started processing {len(documents)} documents",
            "participant_id": participant_id,
            "documents_queued": len(documents)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rag-status")
def get_rag_status():
    """Get RAG system status"""
    try:
        embedding_service = EmbeddingService()
        
        return {
            "embeddings_available": embedding_service.embeddings_available,
            "embedding_model": embedding_service.model_id if embedding_service.embeddings_available else None,
            "features": {
                "semantic_search": embedding_service.embeddings_available,
                "keyword_search": True,
                "document_chunking": True
            },
            "configuration": {
                "chunk_size": DocumentChunkingService.CHUNK_SIZE,
                "chunk_overlap": DocumentChunkingService.CHUNK_OVERLAP,
                "min_chunk_size": DocumentChunkingService.MIN_CHUNK_SIZE
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting RAG status: {e}")
        raise HTTPException(status_code=500, detail=str(e))