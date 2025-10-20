from app.services.storage.cos_storage_ibm import get_object_stream
from app.models.document import Document
from app.dependencies import get_db
from sqlalchemy.orm import Session
import io, fitz, docx, csv

def read_document_bytes(storage_key: str) -> bytes:
    obj = get_object_stream(storage_key)
    return obj["Body"].read()

def extract_text(doc: Document) -> str:
    data = read_document_bytes(doc.storage_key)
    name = (doc.title or "document").lower()
    if name.endswith(".pdf"):
        text = []
        with fitz.open(stream=data, filetype="pdf") as pdf:
            for p in pdf: text.append(p.get_text())
        return "\n".join(text)
    if name.endswith(".docx"):
        f = io.BytesIO(data); d = docx.Document(f)
        return "\n".join(p.text for p in d.paragraphs)
    if name.endswith(".txt"):
        return data.decode("utf-8", errors="replace")
    if name.endswith(".csv"):
        f = io.StringIO(data.decode("utf-8", errors="replace"))
        return "\n".join(", ".join(row) for row in csv.reader(f))
    return data.decode("utf-8", errors="replace")
