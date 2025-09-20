# backend/app/services/seed_dynamic_data.py
from sqlalchemy.orm import Session
from app.models.dynamic_data import DynamicData

BASE_SEEDS = {
    "contact_methods": [
        ("PHONE", "Phone"), ("EMAIL", "Email"), ("SMS", "SMS")
    ],
    "disabilities": [
        ("AUTISM", "Autism Spectrum Disorder"),
        ("MOBILITY", "Mobility Impairment"),
        ("INTELLECTUAL", "Intellectual Disability"),
    ],
    "relationship_types": [
        ("PARENT", "Parent"), ("GUARDIAN", "Guardian"), ("SPOUSE", "Spouse")
    ],
    "service_types": [
        ("CORE", "Core Supports"),
        ("CAPACITY", "Capacity Building"),
        ("CAPITAL", "Capital Supports")
    ],
    "pricing_items": [  # used later for quotation
        ("SVC_001", "Domestic Assistance"),
        ("SVC_002", "Community Access"),
    ],
}

PRICING_META = {
    "SVC_001": {"service_code": "SVC_001", "unit": "hour", "rate": 72.35},
    "SVC_002": {"service_code": "SVC_002", "unit": "hour", "rate": 81.00},
}

def upsert_seed(db: Session, dtype: str, code: str, label: str, meta: dict | None = None):
    obj = db.query(DynamicData).filter(DynamicData.type == dtype, DynamicData.code == code).first()
    if not obj:
        obj = DynamicData(type=dtype, code=code, label=label, is_active=True, meta=meta)
        db.add(obj)
    else:
        obj.label = label
        if meta is not None:
            obj.meta = meta

def run(db: Session) -> None:
    for dtype, entries in BASE_SEEDS.items():
        for code, label in entries:
            meta = None
            if dtype == "pricing_items":
                meta = PRICING_META.get(code)
            upsert_seed(db, dtype, code, label, meta)
    db.commit()
