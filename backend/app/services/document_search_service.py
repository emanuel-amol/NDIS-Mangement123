# backend/app/services/document_search_service.py - ENHANCED SEARCH AND INDEXING
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, text
from app.models.document import Document, DocumentAccess
from app.models.participant import Participant
from typing import List, Optional, Dict, Any, Tuple
import re
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class DocumentSearchService:
    
    @staticmethod
    def search_documents(
        db: Session,
        query: str,
        participant_id: Optional[int] = None,
        category: Optional[str] = None,
        status: Optional[str] = None,
        user_id: Optional[int] = None,
        user_role: str = 'admin',
        page: int = 1,
        page_size: int = 20,
        sort_by: str = 'relevance'
    ) -> Tuple[List[Document], int, Dict[str, Any]]:
        """
        Advanced document search with relevance ranking and full-text search capabilities
        """
        try:
            # Build base query
            base_query = db.query(Document).join(Participant, Document.participant_id == Participant.id)
            
            # Apply participant filter
            if participant_id:
                base