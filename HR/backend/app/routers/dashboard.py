from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Candidate
from sqlalchemy import func

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Count active staff (employees/hired workers)
        active_staff = db.query(Candidate).filter(
            Candidate.status.in_(['Hired', 'Employee'])
        ).count()
        
        # Count active participants (candidates who are applied/in process but not yet hired)
        active_participants = db.query(Candidate).filter(
            Candidate.status.in_(['Active', 'Applied', 'Interviewing', 'In Review'])
        ).count()
        
        # Count total candidates for debugging
        total_candidates = db.query(Candidate).count()
        
        # Count total users for debugging  
        total_users = db.query(User).count()
        
        # Get status breakdown for debugging
        status_breakdown = db.query(
            Candidate.status, 
            func.count(Candidate.id)
        ).group_by(Candidate.status).all()
        
        # Count complaints (placeholder - implement when you have a complaints model)
        complaints = 0
        
        # Count incidents (placeholder - implement when you have an incidents model)
        incidents = 0
        
        return {
            "active_staff": active_staff,
            "active_participants": active_participants,
            "complaints": complaints,
            "incidents": incidents,
            "debug": {
                "total_candidates": total_candidates,
                "total_users": total_users,
                "status_breakdown": {status: count for status, count in status_breakdown}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))