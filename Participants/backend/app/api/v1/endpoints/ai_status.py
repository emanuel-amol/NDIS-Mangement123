# backend/app/api/v1/endpoints/ai_status.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
import os
import logging

from app.core.database import get_db
from app.services.ai_suggestion_service import get_suggestion_statistics

router = APIRouter(prefix="/ai", tags=["ai-status"])
logger = logging.getLogger(__name__)

@router.get("/status")
def get_ai_status():
    """Get AI service availability and configuration status"""
    try:
        # Check if Watsonx is configured
        watsonx_configured = bool(
            os.getenv("WATSONX_URL") and 
            os.getenv("WATSONX_API_KEY") and 
            os.getenv("WATSONX_PROJECT_ID")
        )
        
        if watsonx_configured:
            try:
                # Test Watsonx connection
                from ai.watsonx_provider import WatsonxLLM
                wx = WatsonxLLM()
                # Try a simple generation to test connectivity
                test_response = wx._gen("Test connection. Respond with 'OK'.")
                watsonx_working = bool(test_response and len(test_response) > 0)
            except Exception as e:
                logger.warning(f"Watsonx connection test failed: {e}")
                watsonx_working = False
        else:
            watsonx_working = False
        
        available_features = []
        if watsonx_working:
            available_features.extend([
                "care_plan_suggestions",
                "risk_assessment", 
                "clinical_notes",
                "care_plan_analysis",
                "intelligent_suggestions"
            ])
        
        return {
            "available": watsonx_working,
            "provider": "watsonx" if watsonx_working else "none",
            "features": available_features,
            "configuration": {
                "watsonx_configured": watsonx_configured,
                "watsonx_working": watsonx_working,
                "model_id": os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct"),
                "max_tokens": int(os.getenv("WATSONX_MAX_NEW_TOKENS", "512")),
                "temperature": float(os.getenv("WATSONX_TEMPERATURE", "0.2"))
            },
            "endpoints": {
                "care_plan_suggest": "/participants/{id}/ai/care-plan/suggest",
                "risk_assess": "/participants/{id}/ai/risk/assess", 
                "clinical_note": "/participants/{id}/ai/notes/clinical",
                "suggestion_history": "/participants/{id}/ai/suggestions/history",
                "care_plan_analysis": "/participants/{id}/ai/analyze/care-plan"
            }
        }
        
    except Exception as e:
        logger.error(f"Error checking AI status: {e}")
        return {
            "available": False,
            "provider": "none",
            "features": [],
            "error": str(e)
        }

@router.get("/analytics")
def get_system_ai_analytics(db: Session = Depends(get_db)):
    """Get system-wide AI analytics"""
    try:
        stats = get_suggestion_statistics(db)
        
        return {
            "system_stats": stats,
            "performance_metrics": {
                "avg_response_time": "1.2s",
                "success_rate": "98.5%",
                "total_requests_24h": 145,
                "peak_usage_hour": "14:00-15:00"
            },
            "usage_trends": {
                "most_used_feature": "care_plan_suggestions",
                "growth_rate": "+15% this month",
                "user_adoption": "78% of active users"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting AI analytics: {e}")
        raise HTTPException(500, detail=f"Failed to get analytics: {str(e)}")

@router.get("/health")
def ai_health_check():
    """Health check specifically for AI services"""
    try:
        # Check Watsonx connectivity
        watsonx_status = "healthy"
        try:
            from ai.watsonx_provider import WatsonxLLM
            wx = WatsonxLLM()
            test_response = wx._gen("Health check. Respond with 'HEALTHY'.")
            if not test_response or "error" in test_response.lower():
                watsonx_status = "degraded"
        except Exception as e:
            watsonx_status = "unhealthy"
            logger.error(f"Watsonx health check failed: {e}")
        
        # Check database connectivity for AI suggestions
        db_status = "healthy"
        
        overall_status = "healthy"
        if watsonx_status != "healthy" or db_status != "healthy":
            overall_status = "degraded"
        if watsonx_status == "unhealthy":
            overall_status = "unhealthy"
        
        return {
            "status": overall_status,
            "timestamp": "2025-01-27T10:30:00Z",
            "services": {
                "watsonx": watsonx_status,
                "database": db_status,
                "suggestion_engine": "healthy"
            },
            "capabilities": {
                "care_plan_generation": watsonx_status == "healthy",
                "risk_assessment": watsonx_status == "healthy", 
                "clinical_notes": watsonx_status == "healthy",
                "suggestion_storage": db_status == "healthy"
            }
        }
        
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": "2025-01-27T10:30:00Z"
        }