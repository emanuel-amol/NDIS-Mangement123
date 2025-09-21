# backend/app/services/support_mapping_service.py - FIXED VERSION WITHOUT CIRCULAR IMPORTS
from typing import List, Dict, Any, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import desc

import logging

logger = logging.getLogger(__name__)

class SupportMappingService:
    """Service for mapping care plan supports to NDIS pricing and quotation items"""
    
    @staticmethod
    def get_supports_from_active_care_plan(db: Session, participant_id: int) -> List[Dict[str, Any]]:
        """
        Extract supports from participant's active care plan
        Returns list of support dictionaries compatible with quotation generation
        """
        try:
            # Import here to avoid circular imports
            from app.models.care_plan import CarePlan
            
            # Get the latest care plan for the participant
            care_plan = db.query(CarePlan).filter(
                CarePlan.participant_id == participant_id
            ).order_by(desc(CarePlan.created_at)).first()
            
            if not care_plan:
                logger.warning(f"No care plan found for participant {participant_id}")
                return []
            
            if not care_plan.supports:
                logger.warning(f"No supports found in care plan for participant {participant_id}")
                return []
            
            # Ensure supports is a list
            supports_data = care_plan.supports
            if not isinstance(supports_data, list):
                logger.error(f"Care plan supports is not a list: {type(supports_data)}")
                return []
            
            logger.info(f"Found {len(supports_data)} supports in care plan for participant {participant_id}")
            return supports_data
            
        except Exception as e:
            logger.error(f"Error getting supports from care plan for participant {participant_id}: {str(e)}")
            return []
    
    @staticmethod
    def get_pricing_info(db: Session, support_type: str) -> Optional[Dict[str, Any]]:
        """
        Get pricing information for a support type from your existing dynamic data
        """
        try:
            from app.services.dynamic_data_service import DynamicDataService
            
            # Use your existing service to get pricing data
            pricing_entry = DynamicDataService.get_by_type_and_code(db, "pricing_items", support_type)
            
            if pricing_entry:
                return {
                    "code": pricing_entry.code,
                    "label": pricing_entry.label,
                    "meta": pricing_entry.meta or {}
                }
            
            logger.warning(f"No pricing info found for support type: {support_type}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting pricing info for {support_type}: {str(e)}")
            return None
    
    @staticmethod
    def get_rate(db: Session, support_type: str, frequency: Optional[str] = None, duration: Optional[str] = None) -> Optional[Decimal]:
        """
        Get the rate for a support type, considering frequency and duration
        """
        try:
            pricing_info = SupportMappingService.get_pricing_info(db, support_type)
            
            if not pricing_info or not pricing_info.get("meta"):
                logger.warning(f"No pricing metadata found for support type: {support_type}")
                return None
            
            meta = pricing_info["meta"]
            base_rate = meta.get("rate")
            
            if base_rate is None:
                logger.warning(f"No base rate found for support type: {support_type}")
                return None
            
            # Convert to Decimal for precise calculations
            rate = Decimal(str(base_rate))
            
            # Apply frequency and duration modifiers if available in metadata
            support_mappings = meta.get("support_form_mappings", {})
            
            # Apply duration conversion if available
            if duration and "duration_conversions" in support_mappings:
                duration_multiplier = support_mappings["duration_conversions"].get(duration, 1)
                rate = rate * Decimal(str(duration_multiplier))
            
            # Note: Frequency is typically applied at the quotation level, not rate level
            
            return rate
            
        except Exception as e:
            logger.error(f"Error calculating rate for {support_type}: {str(e)}")
            return None
    
    @staticmethod
    def get_service_description(
        support_type: str,
        duration: Optional[str] = None,
        frequency: Optional[str] = None,
        location: Optional[str] = None,
        staff_ratio: Optional[str] = None,
        notes: Optional[str] = None
    ) -> str:
        """
        Build service description using your dynamic data labels
        """
        try:
            from app.services.dynamic_data_service import DynamicDataService
            
            description_parts = []
            
            # Get the main service type label from dynamic data
            if support_type:
                pricing_entry = DynamicDataService.get_by_type_and_code(db=None, data_type="pricing_items", code=support_type)
                if pricing_entry:
                    description_parts.append(pricing_entry.label)
                else:
                    # Fallback to formatted support type
                    description_parts.append(support_type.replace("_", " ").title())
            
            # Add other details if specified
            if duration and duration != "Not specified":
                description_parts.append(f"Duration: {duration}")
            
            if frequency and frequency != "Not specified":
                description_parts.append(f"Frequency: {frequency}")
            
            if location and location != "Not specified":
                description_parts.append(f"Location: {location}")
            
            if staff_ratio and staff_ratio != "Not specified":
                description_parts.append(f"Staff Ratio: {staff_ratio}")
            
            if notes and notes.strip():
                description_parts.append(f"Notes: {notes.strip()}")
            
            return " | ".join(description_parts) if description_parts else "Support Service"
            
        except Exception as e:
            logger.error(f"Error building service description: {str(e)}")
            return f"Support Service - {support_type}" if support_type else "Support Service"
    
    @staticmethod
    def calculate_quantity_from_duration(duration: Optional[str]) -> Decimal:
        """
        Convert duration string to quantity using your dynamic data system
        """
        if not duration:
            return Decimal("1")
        
        try:
            # Map to your existing duration codes from seed_dynamic_data.py
            duration_mappings = {
                "15_MIN": Decimal("0.25"),
                "30_MIN": Decimal("0.5"),
                "45_MIN": Decimal("0.75"),
                "1_HOUR": Decimal("1"),
                "1_5_HOUR": Decimal("1.5"),
                "2_HOUR": Decimal("2"),
                "3_HOUR": Decimal("3"),
                "4_HOUR": Decimal("4"),
                "HALF_DAY": Decimal("4"),
                "FULL_DAY": Decimal("8"),
                "OVERNIGHT": Decimal("12"),
                "24_HOUR": Decimal("24"),
                "SESSION": Decimal("1"),
                "VISIT": Decimal("1"),
                "ASSESSMENT": Decimal("2")
            }
            
            # Convert common strings to your duration codes
            string_to_code = {
                "15 minutes": "15_MIN",
                "30 minutes": "30_MIN",
                "45 minutes": "45_MIN", 
                "1 hour": "1_HOUR",
                "1.5 hours": "1_5_HOUR",
                "2 hours": "2_HOUR",
                "3 hours": "3_HOUR",
                "4 hours": "4_HOUR",
                "Half day": "HALF_DAY",
                "Full day": "FULL_DAY",
                "Overnight": "OVERNIGHT",
                "24 hours": "24_HOUR",
                "Session": "SESSION",
                "Visit": "VISIT",
                "Assessment": "ASSESSMENT"
            }
            
            # Try direct mapping first
            if duration in string_to_code:
                code = string_to_code[duration]
                return duration_mappings.get(code, Decimal("1"))
            
            # Try code format
            duration_code = duration.upper().replace(" ", "_").replace("-", "_")
            if duration_code in duration_mappings:
                return duration_mappings[duration_code]
            
            # Extract numeric value as fallback
            import re
            numbers = re.findall(r'\d+\.?\d*', duration.lower())
            if numbers and "hour" in duration.lower():
                return Decimal(numbers[0])
            
            return Decimal("1")
            
        except Exception as e:
            logger.error(f"Error calculating quantity from duration '{duration}': {str(e)}")
            return Decimal("1")
    
    @staticmethod
    def get_frequency_multiplier(frequency: Optional[str]) -> Decimal:
        """
        Get frequency multiplier using your dynamic data system
        """
        if not frequency:
            return Decimal("1")
        
        try:
            # Map to your existing frequency codes from seed_dynamic_data.py
            frequency_mappings = {
                "ONE_OFF": Decimal("1"),
                "DAILY": Decimal("7"),
                "TWICE_DAILY": Decimal("14"),
                "WEEKLY": Decimal("1"),
                "TWICE_WEEKLY": Decimal("2"),
                "THREE_WEEKLY": Decimal("3"),
                "FORTNIGHTLY": Decimal("0.5"),
                "MONTHLY": Decimal("0.25"),
                "INTENSIVE": Decimal("5"),
                "AS_NEEDED": Decimal("1"),
                "REGULAR": Decimal("2")
            }
            
            # Convert common strings to your frequency codes
            string_to_code = {
                "One-off": "ONE_OFF",
                "Daily": "DAILY",
                "Twice daily": "TWICE_DAILY",
                "Weekly": "WEEKLY", 
                "Twice weekly": "TWICE_WEEKLY",
                "Three times weekly": "THREE_WEEKLY",
                "Fortnightly": "FORTNIGHTLY",
                "Monthly": "MONTHLY",
                "Intensive Period": "INTENSIVE",
                "As needed": "AS_NEEDED",
                "Regular": "REGULAR"
            }
            
            # Try direct mapping
            if frequency in string_to_code:
                code = string_to_code[frequency]
                return frequency_mappings.get(code, Decimal("1"))
            
            # Try code format
            frequency_code = frequency.upper().replace(" ", "_").replace("-", "_")
            if frequency_code in frequency_mappings:
                return frequency_mappings[frequency_code]
            
            return Decimal("1")
            
        except Exception as e:
            logger.error(f"Error getting frequency multiplier for '{frequency}': {str(e)}")
            return Decimal("1")
    
    @staticmethod
    def validate_support_data(support: Dict[str, Any]) -> List[str]:
        """
        Validate support data and return list of validation errors
        """
        errors = []
        
        # Check required fields
        if not support.get("support_type") and not support.get("supportType"):
            errors.append("Support type is required")
        
        # Check if support type exists in pricing
        support_type = support.get("support_type") or support.get("supportType")
        if support_type:
            # You could add a database check here
            pass
        
        # Validate quantity if provided
        quantity = support.get("quantity")
        if quantity is not None:
            try:
                float(quantity)
            except (ValueError, TypeError):
                errors.append("Quantity must be a valid number")
        
        return errors
    
    @staticmethod
    def get_default_support_categories() -> List[Dict[str, Any]]:
        """
        Get default support categories for fallback
        """
        return [
            {
                "support_type": "DOMESTIC_ASSISTANCE",
                "duration": "2 hours",
                "frequency": "Weekly",
                "location": "Participant's Home",
                "staff_ratio": "1:1",
                "quantity": 2
            },
            {
                "support_type": "COMMUNITY_ACCESS", 
                "duration": "3 hours",
                "frequency": "Weekly",
                "location": "Community",
                "staff_ratio": "1:1",
                "quantity": 3
            },
            {
                "support_type": "PERSONAL_CARE",
                "duration": "1 hour", 
                "frequency": "Daily",
                "location": "Participant's Home",
                "staff_ratio": "1:1",
                "quantity": 1
            }
        ]