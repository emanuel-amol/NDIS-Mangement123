# app/api/v1/endpoints/docgen.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db import get_db

router = APIRouter(prefix="/templates", tags=["docgen"])

@router.get("", summary="List available document templates")
def list_templates(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT id, name, version, doc_type, is_active, created_at
        FROM doc_templates
        ORDER BY name
    """)).mappings().all()
    return {"items": [dict(r) for r in rows]}

@router.get("/{template_id}", summary="Get a single template (metadata + content)")
def get_template(template_id: str, db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT id, name, version, doc_type, is_active, created_at, content
        FROM doc_templates
        WHERE id = :id
    """), {"id": template_id}).mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    return dict(row)

@router.get("/status/enabled", summary="Doc generation enabled flag")
def docgen_enabled(db: Session = Depends(get_db)):
    row = db.execute(text("""
        SELECT (value->>'enabled')::bool AS enabled
        FROM app_settings
        WHERE key = 'docgen_enabled'
    """)).mappings().first()
    return {"enabled": bool(row and row["enabled"])}
