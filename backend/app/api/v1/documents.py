# backend/app/api/v1/documents.py
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Optional
import uuid
from datetime import datetime, date

from app.schemas.document import DocumentCreate, DocumentResponse

router = APIRouter()

# In-memory storage (replace with database later)
documents_db = {}

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    participant_id: Optional[str] = None,
    home_id: Optional[str] = None,
    title: str = "",
    document_type: str = "general_documents",
    category: str = "general",
    visible_to_worker: bool = False
):
    """Upload a document"""
    document_id = str(uuid.uuid4())
    now = datetime.now()
    
    # In a real app, you'd save the file to cloud storage
    file_url = f"/files/{document_id}_{file.filename}"
    
    document_data = {
        "id": document_id,
        "participant_id": participant_id,
        "home_id": home_id,
        "title": title or file.filename,
        "document_type": document_type,
        "category": category,
        "file_url": file_url,
        "file_size": file.size or 0,
        "file_type": file.content_type or "application/octet-stream",
        "expiry_date": None,
        "visible_to_worker": visible_to_worker,
        "uploaded_by": "current_user",  # Replace with actual user
        "is_expired": False,
        "created_at": now,
        "updated_at": now
    }
    
    documents_db[document_id] = document_data
    return DocumentResponse(**document_data)

@router.get("/", response_model=List[DocumentResponse])
async def get_documents(
    participant_id: Optional[str] = None,
    home_id: Optional[str] = None,
    document_type: Optional[str] = None
):
    """Get documents with optional filtering"""
    documents = list(documents_db.values())
    
    if participant_id:
        documents = [doc for doc in documents if doc["participant_id"] == participant_id]
    if home_id:
        documents = [doc for doc in documents if doc["home_id"] == home_id]
    if document_type:
        documents = [doc for doc in documents if doc["document_type"] == document_type]
    
    # Check for expired documents
    today = date.today()
    for doc in documents:
        if doc["expiry_date"] and doc["expiry_date"] < today:
            doc["is_expired"] = True
    
    return [DocumentResponse(**doc) for doc in documents]

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str):
    """Get a specific document"""
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = documents_db[document_id]
    
    # Check if expired
    if doc["expiry_date"] and doc["expiry_date"] < date.today():
        doc["is_expired"] = True
    
    return DocumentResponse(**doc)

@router.put("/{document_id}/expiry")
async def set_document_expiry(document_id: str, expiry_date: date):
    """Set expiry date for a document"""
    if document_id not in documents_db:
        raise HTTPException(status_code=404, detail="Document not found")
    
    documents_db[document_id]["expiry_date"] = expiry_date
    documents_db[document_id]["updated_at"] = datetime.now()
    
    return {"message": "Expiry date updated successfully"}

@router.get("/search/{query}", response_model=List[DocumentResponse])
async def search_documents(query: str):
    """Search documents by title, category, or type"""
    results = []
    query_lower = query.lower()
    
    for doc in documents_db.values():
        if (query_lower in doc["title"].lower() or 
            query_lower in doc["category"].lower() or 
            query_lower in doc["document_type"].lower()):
            results.append(doc)
    
    return [DocumentResponse(**doc) for doc in results]