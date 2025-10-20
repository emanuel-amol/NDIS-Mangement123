"""
Embedding Service for generating vector embeddings using Watsonx.
"""
from typing import List, Optional, Dict, Any
import logging
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document_chunk import DocumentChunk

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating and managing embeddings using Watsonx"""
    
    def __init__(self):
        self.model_id = settings.EMBEDDINGS_MODEL
        self.embeddings_available = settings.is_embeddings_configured
        
        if self.embeddings_available:
            try:
                from ibm_watsonx_ai import Credentials
                from ibm_watsonx_ai.foundation_models import Embeddings
                
                credentials = Credentials(
                    url=settings.WATSONX_URL,
                    api_key=settings.WATSONX_API_KEY
                )
                
                self.embeddings = Embeddings(
                    model_id=self.model_id,
                    credentials=credentials,
                    project_id=settings.WATSONX_PROJECT_ID
                )
                
                logger.info(f"Embeddings initialized with model: {self.model_id}")
                
            except Exception as e:
                logger.error(f"Failed to initialize embeddings: {e}")
                self.embeddings_available = False
                self.embeddings = None
        else:
            self.embeddings = None
            logger.warning("Embeddings not configured - using keyword search only")
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding vector for a single text"""
        if not self.embeddings_available or not self.embeddings:
            return None
        
        try:
            result = self.embeddings.embed_documents([text])
            if result and len(result) > 0:
                return result[0]
            return None
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return None
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """Generate embeddings for multiple texts"""
        if not self.embeddings_available or not self.embeddings:
            return [None] * len(texts)
        
        try:
            results = self.embeddings.embed_documents(texts)
            return results if results else [None] * len(texts)
            
        except Exception as e:
            logger.error(f"Error generating batch embeddings: {e}")
            return [None] * len(texts)
    
    def embed_document_chunks(self, db: Session, document_id: int) -> int:
        """Generate embeddings for all chunks of a document"""
        if not self.embeddings_available:
            logger.warning(f"Embeddings not available for document {document_id}")
            return 0
        
        try:
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.document_id == document_id,
                DocumentChunk.embedding_vector.is_(None)
            ).all()
            
            if not chunks:
                return 0
            
            texts = [chunk.chunk_text for chunk in chunks]
            embeddings = self.generate_embeddings_batch(texts)
            
            embedded_count = 0
            for chunk, embedding in zip(chunks, embeddings):
                if embedding:
                    chunk.embedding_vector = embedding
                    chunk.embedding_model = self.model_id
                    embedded_count += 1
            
            db.commit()
            logger.info(f"Embedded {embedded_count}/{len(chunks)} chunks for document {document_id}")
            return embedded_count
            
        except Exception as e:
            logger.error(f"Error embedding document chunks: {e}")
            db.rollback()
            return 0
    
    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)
    
    def search_similar_chunks(
        self, 
        db: Session, 
        query_text: str, 
        participant_id: Optional[int] = None,
        top_k: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks using embeddings"""
        if not self.embeddings_available:
            return []
        
        try:
            query_embedding = self.generate_embedding(query_text)
            if not query_embedding:
                return []
            
            query = db.query(DocumentChunk).filter(
                DocumentChunk.embedding_vector.isnot(None)
            )
            
            if participant_id:
                query = query.filter(DocumentChunk.participant_id == participant_id)
            
            chunks = query.all()
            
            results = []
            for chunk in chunks:
                if chunk.embedding_vector:
                    similarity = self.cosine_similarity(query_embedding, chunk.embedding_vector)
                    
                    if similarity >= similarity_threshold:
                        results.append({
                            'chunk': chunk,
                            'similarity': similarity
                        })
            
            results.sort(key=lambda x: x['similarity'], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Error searching similar chunks: {e}")
            return []