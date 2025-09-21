# backend/app/services/support_mapping_service.py - NEW SERVICE FOR MAPPING FORM VALUES TO PRICING

from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.dynamic_data import DynamicData
import logging

logger = logging.getLogger(__name__)

class SupportMappingService:
    """Service to map care plan form values to pricing codes and calculate quantities"""
    
    # Mapping from form support types to pricing codes
    SUPPORT_TYPE_TO_PRICING = {
        # Form values -> Pricing codes
        "Respite Care": "RESPITE_CARE",
        "Personal Care": "PERSONAL_CARE", 
        "Domestic Assistance": "DOMESTIC_ASSISTANCE",
        "Community Access": "COMMUNITY_ACCESS",
        "Transport": "TRANSPORT",
        "Behavior Support": "BEHAVIOR_SUPPORT",
        "Speech Therapy": "SPEECH_THERAPY",
        "Occupational Therapy": "OT_SERVICES",
        "Physiotherapy": "PHYSIO_SERVICES",
        "Psychology": "PSYCHOLOGY",
        "Social Work": "SOCIAL_WORK",
        "Nursing": "NURSING",
        "Dietitian": "DIETITIAN"
    }
    
    # Duration mappings (form values -> hours)
    DURATION_MAPPINGS = {
        "15 minutes": 0.25,
        "30 minutes": 0.5,
        "45 minutes": 0.75,
        "1 hour": 1.0,
        "1.5 hours": 1.5,
        "2 hours": 2.0,
        "3 hours": 3.0,
        "4 hours": 4.0,
        "Half day": 4.0,
        "Full day": 8.0,
        "Overnight": 12.0,
        "24 hours": 24.0,
        "Session": 1.0,
        "Visit": 1.0,
        "Assessment": 2.0
    }
    
    # Frequency mappings (form values -> weekly multiplier)
    FREQUENCY_MAPPINGS = {
        "One-off": 1.0,
        "Daily": 7.0,
        "Twice daily": 14.0,
        "Weekly": 1.0,
        "Twice weekly": 2.0,
        "Three times weekly": 3.0,
        "Fortnightly": 0.5,
        "Monthly": 0.25,
        "Intensive Period": 5.0,
        "As needed": 1.0,
        "Regular": 2.0
    }
    
    @staticmethod
    def get_pricing_info(db: Session, support_type: str) -> Optional[Dict]:
        """Get pricing information for a support type"""
        try:
            # Map form value to pricing code
            pricing_code = SupportMappingService.SUPPORT_TYPE_TO_PRICING.get(support_type)
            if not pricing_code:
                logger.warning(f"No pricing mapping found for support type: {support_type}")
                return None
            
            # Get pricing item from dynamic data
            pricing_item = db.query(DynamicData).filter(
                DynamicData.type == "pricing_items",
                DynamicData.code == pricing_code,
                DynamicData.is_active == True
            ).first()
            
            if not pricing_item:
                logger.warning(f"No pricing item found for code: {pricing_code}")
                return None
            
            return {
                "code": pricing_code,
                "label": pricing_item.label,
                "meta": pricing_item.meta or {}
            }
            
        except Exception as e:
            logger.error(f"Error getting pricing info for {support_type}: {str(e)}")
            return None
    
    @staticmethod
    def calculate_quantity(duration: str, frequency: str) -> Tuple[float, str]:
        """Calculate quantity from duration and frequency"""
        try:
            # Get duration in hours
            duration_hours = SupportMappingService.DURATION_MAPPINGS.get(duration, 1.0)
            
            # Get frequency multiplier (per week)
            frequency_multiplier = SupportMappingService.FREQUENCY_MAPPINGS.get(frequency, 1.0)
            
            # Calculate weekly quantity
            weekly_quantity = duration_hours * frequency_multiplier
            
            # Determine unit
            unit = "hour"
            if duration in ["Session", "Visit", "Assessment"]:
                unit = duration.lower()
            
            return weekly_quantity, unit
            
        except Exception as e:
            logger.error(f"Error calculating quantity for {duration} {frequency}: {str(e)}")
            return 1.0, "hour"
    
    @staticmethod
    def get_service_description(support_type: str, duration: str, frequency: str, 
                              location: str = None, staff_ratio: str = None, 
                              notes: str = None) -> str:
        """Generate a comprehensive service description"""
        try:
            description = support_type
            
            # Add duration and frequency
            if duration and frequency:
                description += f" ({duration}, {frequency})"
            
            # Add location if specified and not standard
            if location and location not in ["Participant's Home", "PARTICIPANT_HOME"]:
                location_clean = location.replace("_", " ").title()
                description += f" at {location_clean}"
            
            # Add staff ratio if not standard 1:1
            if staff_ratio and staff_ratio not in ["1:1 (One staff to one participant)", "ONE_TO_ONE"]:
                ratio_clean = staff_ratio.replace("_", ":").replace("ONE", "1").replace("TWO", "2")
                if "(" in staff_ratio:
                    ratio_clean = staff_ratio.split("(")[0].strip()
                description += f" - {ratio_clean} staffing"
            
            # Add notes if provided
            if notes and notes.strip():
                description += f" - {notes.strip()}"
            
            return description
            
        except Exception as e:
            logger.error(f"Error generating service description: {str(e)}")
            return support_type or "Support Service"
    
    @staticmethod
    def get_ndis_service_code(db: Session, support_type: str) -> str:
        """Get NDIS service code for a support type"""
        try:
            pricing_info = SupportMappingService.get_pricing_info(db, support_type)
            if pricing_info and pricing_info.get("meta", {}).get("service_code"):
                return pricing_info["meta"]["service_code"]
            
            # Fallback codes based on support type
            fallback_codes = {
                "Respite Care": "01_012_0117_1_1",
                "Personal Care": "01_013_0107_1_1", 
                "Domestic Assistance": "01_011_0107_1_1",
                "Community Access": "01_015_0107_1_1",
                "Transport": "01_016_0136_1_1",
                "Behavior Support": "15_052_0128_1_1",
                "Speech Therapy": "15_054_0128_1_1",
                "Occupational Therapy": "15_055_0128_1_1",
                "Physiotherapy": "15_055_0128_1_1",
                "Psychology": "15_057_0128_1_1",
                "Social Work": "15_058_0128_1_1",
                "Nursing": "15_061_0128_1_1",
                "Dietitian": "15_059_0128_1_1"
            }
            
            return fallback_codes.get(support_type, "01_011_0107_1_1")
            
        except Exception as e:
            logger.error(f"Error getting NDIS service code for {support_type}: {str(e)}")
            return "01_011_0107_1_1"  # Default to domestic assistance
    
    @staticmethod
    def get_support_rate(db: Session, support_type: str) -> float:
        """Get hourly rate for a support type"""
        try:
            pricing_info = SupportMappingService.get_pricing_info(db, support_type)
            if pricing_info and pricing_info.get("meta", {}).get("rate"):
                return float(pricing_info["meta"]["rate"])
            
            # Fallback rates (2024 NDIS price guide)
            fallback_rates = {
                "Respite Care": 68.50,
                "Personal Care": 78.90,
                "Domestic Assistance": 72.35,
                "Community Access": 75.20,
                "Transport": 1.08,  # per km
                "Behavior Support": 193.99,
                "Speech Therapy": 193.99,
                "Occupational Therapy": 193.99,
                "Physiotherapy": 193.99,
                "Psychology": 214.41,
                "Social Work": 163.56,
                "Nursing": 163.56,
                "Dietitian": 193.99
            }
            
            return fallback_rates.get(support_type, 75.00)
            
        except Exception as e:
            logger.error(f"Error getting support rate for {support_type}: {str(e)}")
            return 75.00  # Default rate