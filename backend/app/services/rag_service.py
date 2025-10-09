# backend/app/services/rag_service.py
from sqlalchemy.orm import Session
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import EmbeddingService
from typing import List, Dict, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class RAGService:
    """Retrieval Augmented Generation service"""
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    def search_participant_documents(
        self,
        db: Session,
        participant_id: int,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Search participant's documents using semantic similarity.
        Falls back to keyword search if embeddings unavailable.
        """
        try:
            # Get all chunks for participant
            chunks = db.query(DocumentChunk).filter(
                DocumentChunk.participant_id == participant_id
            ).all()
            
            if not chunks:
                logger.info(f"No document chunks found for participant {participant_id}")
                return []
            
            # Try semantic search first
            if self.embedding_service.embeddings_available:
                results = self._semantic_search(
                    query=query,
                    chunks=chunks,
                    top_k=top_k,
                    similarity_threshold=similarity_threshold
                )
                
                if results:
                    logger.info(f"Semantic search returned {len(results)} results")
                    return results
            
            # Fallback to keyword search
            logger.info("Using keyword search fallback")
            return self._keyword_search(
                query=query,
                chunks=chunks,
                top_k=top_k
            )
            
        except Exception as e:
            logger.error(f"Error searching participant documents: {e}")
            return []
    
    def _semantic_search(
        self,
        query: str,
        chunks: List[DocumentChunk],
        top_k: int,
        similarity_threshold: float
    ) -> List[Dict[str, Any]]:
        """Semantic search using embeddings"""
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_embedding(query)
            
            if not query_embedding:
                logger.warning("Failed to generate query embedding")
                return []
            
            # Calculate similarities
            results = []
            for chunk in chunks:
                if not chunk.embedding_vector:
                    continue
                
                similarity = EmbeddingService.cosine_similarity(
                    query_embedding,
                    chunk.embedding_vector
                )
                
                if similarity >= similarity_threshold:
                    results.append({
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "chunk_text": chunk.chunk_text,
                        "chunk_index": chunk.chunk_index,
                        "similarity_score": similarity,
                        "metadata": chunk.chunk_metadata,
                        "search_type": "semantic"
                    })
            
            # Sort by similarity and return top_k
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Error in semantic search: {e}")
            return []
    
    def _keyword_search(
        self,
        query: str,
        chunks: List[DocumentChunk],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Simple keyword-based search fallback"""
        try:
            query_lower = query.lower()
            query_terms = set(query_lower.split())
            
            results = []
            for chunk in chunks:
                chunk_text_lower = chunk.chunk_text.lower()
                
                # Count matching terms
                matches = sum(1 for term in query_terms if term in chunk_text_lower)
                
                if matches > 0:
                    # Simple scoring: percentage of query terms found
                    score = matches / len(query_terms)
                    
                    results.append({
                        "chunk_id": chunk.id,
                        "document_id": chunk.document_id,
                        "chunk_text": chunk.chunk_text,
                        "chunk_index": chunk.chunk_index,
                        "similarity_score": score,
                        "metadata": chunk.chunk_metadata,
                        "search_type": "keyword"
                    })
            
            # Sort by score and return top_k
            results.sort(key=lambda x: x["similarity_score"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Error in keyword search: {e}")
            return []
    
    def get_context_for_ai(
        self,
        db: Session,
        participant_id: int,
        query: str,
        max_context_length: int = 2000
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Get relevant context from documents for AI query.
        Returns (context_text, source_chunks)
        """
        try:
            # Search for relevant chunks
            relevant_chunks = self.search_participant_documents(
                db=db,
                participant_id=participant_id,
                query=query,
                top_k=5
            )
            
            if not relevant_chunks:
                return "", []
            
            # Build context string
            context_parts = []
            total_length = 0
            sources_used = []
            
            for chunk in relevant_chunks:
                chunk_text = chunk["chunk_text"]
                chunk_length = len(chunk_text)
                
                # Check if adding this chunk would exceed limit
                if total_length + chunk_length > max_context_length:
                    # Try to fit partial chunk
                    remaining_space = max_context_length - total_length
                    if remaining_space > 200:  # Only add if meaningful
                        chunk_text = chunk_text[:remaining_space] + "..."
                        context_parts.append(chunk_text)
                        sources_used.append(chunk)
                    break
                
                context_parts.append(chunk_text)
                sources_used.append(chunk)
                total_length += chunk_length
            
            context_text = "\n\n---\n\n".join(context_parts)
            
            logger.info(f"Built context of {total_length} characters from {len(sources_used)} chunks")
            
            return context_text, sources_used
            
        except Exception as e:
            logger.error(f"Error getting context for AI: {e}")
            return "", []