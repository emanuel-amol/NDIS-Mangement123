# backend/app/api/v1/endpoints/quotations.py - FIXED TO UPDATE WORKFLOW

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.services import quotation_service
from app.models.care_plan import ProspectiveWorkflow  # Import the workflow model
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotations", tags=["quotations"])


@router.post("/participants/{participant_id}/generate-from-care-plan", 
             status_code=status.HTTP_201_CREATED)
def generate_from_care_plan(participant_id: int, db: Session = Depends(get_db)):
    """
    Generate a quotation from a participant's finalised care plan.
    
    Requirements:
    - Participant must have a finalised care plan
    - Care plan must have supports defined
    
    UPDATED: Now automatically updates the prospective workflow
    """
    try:
        quotation = quotation_service.generate_from_care_plan(db, participant_id=participant_id)
        
        # FIXED: Update workflow to mark quotation as generated
        workflow = db.query(ProspectiveWorkflow).filter(
            ProspectiveWorkflow.participant_id == participant_id
        ).first()
        
        if workflow:
            workflow.quotation_generated = True
            workflow.quotation_generated_date = datetime.now()
            workflow.updated_at = datetime.now()
            db.commit()
            logger.info(f"Updated workflow for participant {participant_id} - quotation generated")
        
        logger.info(f"Generated quotation {quotation['quote_number']} for participant {participant_id}")
        return quotation
    except ValueError as e:
        logger.warning(f"Failed to generate quotation for participant {participant_id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error generating quotation for participant {participant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while generating quotation")


@router.get("/participants/{participant_id}")
def list_participant_quotations(participant_id: int, db: Session = Depends(get_db)):
    """Get all quotations for a participant"""
    try:
        quotations = quotation_service.list_by_participant(db, participant_id=participant_id)
        return quotations
    except Exception as e:
        logger.error(f"Error listing quotations for participant {participant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve quotations")


@router.get("/{quotation_id}")
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """Get a specific quotation by ID"""
    try:
        quotation = quotation_service.get_by_id(db, quotation_id)
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        return quotation
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving quotation {quotation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve quotation")


@router.post("/{quotation_id}/finalise")
def finalise_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Mark a quotation as final (locks it from further edits)
    
    UPDATED: Now automatically updates the prospective workflow
    """
    try:
        quotation = quotation_service.finalise(db, quotation_id)
        
        # FIXED: Update workflow when quotation is finalized
        participant_id = quotation.get('participant_id')
        if participant_id:
            workflow = db.query(ProspectiveWorkflow).filter(
                ProspectiveWorkflow.participant_id == participant_id
            ).first()
            
            if workflow:
                workflow.quotation_generated = True
                workflow.quotation_generated_date = datetime.now()
                workflow.updated_at = datetime.now()
                db.commit()
                logger.info(f"Updated workflow for participant {participant_id} - quotation finalized")
        
        logger.info(f"Finalised quotation {quotation['quote_number']}")
        return quotation
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error finalising quotation {quotation_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to finalise quotation")


@router.get("/participants/{participant_id}/latest")
def get_latest_quotation(participant_id: int, db: Session = Depends(get_db)):
    """Get the most recent quotation for a participant"""
    try:
        quotations = quotation_service.list_by_participant(db, participant_id=participant_id)
        if not quotations:
            raise HTTPException(status_code=404, detail="No quotations found for participant")
        
        # Return the most recent (first in the list since they're ordered by created_at desc)
        return quotations[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting latest quotation for participant {participant_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve latest quotation")


@router.delete("/{quotation_id}")
def delete_quotation(quotation_id: int, db: Session = Depends(get_db)):
    """
    Delete a quotation (only draft quotations can be deleted)
    
    UPDATED: Updates workflow if this was the last quotation
    """
    try:
        quotation = quotation_service.get_by_id(db, quotation_id)
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        
        if quotation["status"] == "final":
            raise HTTPException(status_code=400, detail="Cannot delete finalised quotations")
        
        participant_id = quotation.get("participant_id")
        
        # Get the actual model object for deletion
        from app.models.quotation import Quotation
        quotation_model = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        
        if quotation_model:
            db.delete(quotation_model)
            db.commit()
            logger.info(f"Deleted quotation {quotation['quote_number']}")
            
            # FIXED: Check if there are any remaining quotations
            if participant_id:
                remaining_quotations = quotation_service.list_by_participant(db, participant_id=participant_id)
                
                # If no quotations left, update workflow
                if not remaining_quotations:
                    workflow = db.query(ProspectiveWorkflow).filter(
                        ProspectiveWorkflow.participant_id == participant_id
                    ).first()
                    
                    if workflow and workflow.quotation_generated:
                        workflow.quotation_generated = False
                        workflow.quotation_generated_date = None
                        workflow.updated_at = datetime.now()
                        db.commit()
                        logger.info(f"Updated workflow for participant {participant_id} - no quotations remaining")
        
        return {"message": "Quotation deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting quotation {quotation_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete quotation")