from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.template_data import TemplateData

router = APIRouter(prefix="/api/v1/template-data", tags=["template-data"])

class TemplateDataIn(BaseModel):
    template_key: str
    participant_id: Optional[int] = None
    status: str = "draft"
    data: Dict[str, Any]

class TemplateDataOut(BaseModel):
    id: int
    template_key: str
    participant_id: Optional[int]
    status: str
    data: Dict[str, Any]
    class Config:
        orm_mode = True

@router.post("", response_model=TemplateDataOut, status_code=201)
def create_template_data(payload: TemplateDataIn, db: Session = Depends(get_db)):
    row = TemplateData(
        template_key=payload.template_key,
        participant_id=payload.participant_id,
        status=payload.status,
        data=payload.data,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row

@router.get("", response_model=List[TemplateDataOut])
def list_template_data(
    db: Session = Depends(get_db),
    participant_id: Optional[int] = Query(None),
    template_key: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(TemplateData)
    if participant_id is not None:
        q = q.filter(TemplateData.participant_id == participant_id)
    if template_key:
        q = q.filter(TemplateData.template_key == template_key)
    if status:
        q = q.filter(TemplateData.status == status)
    return q.order_by(TemplateData.id.desc()).offset(offset).limit(limit).all()
