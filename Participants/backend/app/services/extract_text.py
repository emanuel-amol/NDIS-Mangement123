# backend/app/services/ingest/extract_text.py
import io
from typing import List, Dict
from app.services.storage.cos_storage_ibm import get_object_stream

def extract_and_chunk(cos_key: str, chunk_size: int = 1200, overlap: int = 150) -> List[Dict]:
    """
    Extract text from a document in COS and chunk it for AI processing.
    
    Args:
        cos_key: The COS object key
        chunk_size: Maximum size of each chunk in characters
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of chunks with text and metadata
    """
    try:
        # Get document from COS
        stream = get_object_stream(cos_key)
        data = io.BytesIO(b"".join(stream))
        
        # Extract text based on file type
        text = ""
        file_type = cos_key.lower().split('.')[-1] if '.' in cos_key else 'unknown'
        
        if file_type == 'pdf':
            text = extract_pdf_text(data)
        elif file_type in ['docx', 'doc']:
            text = extract_docx_text(data)
        elif file_type == 'txt':
            text = data.read().decode('utf-8', errors='replace')
        else:
            # Try to decode as text
            text = data.read().decode('utf-8', errors='replace')
        
        # Chunk the text
        chunks = []
        text_length = len(text)
        
        if text_length == 0:
            return []
        
        start = 0
        chunk_index = 0
        
        while start < text_length:
            end = min(start + chunk_size, text_length)
            chunk_text = text[start:end]
            
            chunks.append({
                "text": chunk_text,
                "meta": {
                    "cos_key": cos_key,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end,
                    "total_length": text_length
                }
            })
            
            chunk_index += 1
            start = end - overlap if end < text_length else end
        
        return chunks
        
    except Exception as e:
        print(f"Error extracting text from {cos_key}: {e}")
        return []

def extract_pdf_text(data: io.BytesIO) -> str:
    """Extract text from PDF"""
    try:
        import fitz  # PyMuPDF
        text = []
        with fitz.open(stream=data, filetype="pdf") as pdf:
            for page in pdf:
                text.append(page.get_text())
        return "\n".join(text)
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return ""

def extract_docx_text(data: io.BytesIO) -> str:
    """Extract text from DOCX"""
    try:
        import docx
        doc = docx.Document(data)
        return "\n".join([p.text for p in doc.paragraphs])
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
        return ""