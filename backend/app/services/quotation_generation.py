# backend/app/services/quotation_generation.py - COMPLETE DYNAMIC DATA QUOTATION GENERATION SERVICE

from sqlalchemy.orm import Session
from app.models.dynamic_data import DynamicData
from app.models.participant import Participant
from app.models.care_plan import CarePlan  
from app.models.quotation import Quotation, QuotationItem
from app.schemas.quotation import QuotationCreate, QuotationItemCreate
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal, ROUND_HALF_UP
import logging
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)

class QuotationGenerationError(Exception):
    """Custom exception for quotation generation errors"""
    pass

class DynamicDataQuotationService:
    """Service for generating quotations from care plans using dynamic data"""
    
    def __init__(self, db: Session):
        self.db = db
        self._pricing_cache = {}
        self._dynamic_data_cache = {}
        self._load_dynamic_data()
    
    def _load_dynamic_data(self):
        """Load and cache all dynamic data for quick lookup"""
        logger.info("Loading dynamic data cache for quotation generation...")
        
        try:
            # Load all dynamic data
            all_data = self.db.query(DynamicData).filter(DynamicData.is_active == True).all()
            
            # Organize by type for quick lookup
            for item in all_data:
                if item.type not in self._dynamic_data_cache:
                    self._dynamic_data_cache[item.type] = {}
                self._dynamic_data_cache[item.type][item.code] = {
                    'label': item.label,
                    'meta': item.meta or {}
                }
            
            # Build pricing cache with enhanced metadata
            self._pricing_cache = self._dynamic_data_cache.get('pricing_items', {})
            
            logger.info(f"Loaded {len(self._pricing_cache)} pricing items and {len(self._dynamic_data_cache)} dynamic data types")
            
        except Exception as e:
            logger.error(f"Failed to load dynamic data cache: {str(e)}")
            raise QuotationGenerationError(f"Failed to initialize dynamic data: {str(e)}")
    
    def get_dynamic_data(self, data_type: str, code: str) -> Optional[Dict]:
        """Get dynamic data item by type and code"""
        return self._dynamic_data_cache.get(data_type, {}).get(code)
    
    def get_pricing_item(self, code: str) -> Optional[Dict]:
        """Get pricing item with metadata"""
        return self._pricing_cache.get(code)
    
    def convert_support_to_pricing_code(self, support_type: str) -> Optional[str]:
        """Convert care plan support type to pricing item code"""
        
        # Direct mapping (most common case)
        SUPPORT_TO_PRICING_MAP = {
            # Core Support Services
            'RESPITE_CARE': 'RESPITE_CARE',
            'PERSONAL_CARE': 'PERSONAL_CARE', 
            'DOMESTIC_ASSISTANCE': 'DOMESTIC_ASSISTANCE',
            'COMMUNITY_ACCESS': 'COMMUNITY_ACCESS',
            'TRANSPORT': 'TRANSPORT',
            'SIL': 'SIL_SUPPORT',
            
            # Capacity Building Services
            'BEHAVIOR_SUPPORT': 'BEHAVIOR_SUPPORT',
            'OCCUPATIONAL_THERAPY': 'OT_SERVICES',
            'SPEECH_THERAPY': 'SPEECH_THERAPY',
            'PHYSIOTHERAPY': 'PHYSIO_SERVICES',
            'PSYCHOLOGY': 'PSYCHOLOGY',
            'SOCIAL_WORK': 'SOCIAL_WORK',
            'DIETITIAN': 'DIETITIAN',
            'NURSING': 'NURSING',
            'EXERCISE_PHYSIOLOGY': 'EXERCISE_PHYSIOLOGY',
            
            # Support Service Types (from enhanced data)
            'MEAL_PREPARATION': 'DOMESTIC_ASSISTANCE',
            'SOCIAL_PARTICIPATION': 'COMMUNITY_ACCESS',
            'GROUP_ACTIVITIES': 'COMMUNITY_ACCESS',
            'COMMUNITY_PROGRAMS': 'COMMUNITY_ACCESS',
            'RECREATION_ACTIVITIES': 'COMMUNITY_ACCESS',
            'DAILY_LIVING_SKILLS': 'PERSONAL_CARE',
            'HOUSEHOLD_TASKS': 'DOMESTIC_ASSISTANCE',
            'MONEY_MANAGEMENT': 'PERSONAL_CARE',
            'SELF_CARE_SKILLS': 'PERSONAL_CARE',
            'COMMUNICATION_SKILLS': 'SPEECH_THERAPY',
            'SOCIAL_SKILLS': 'BEHAVIOR_SUPPORT',
            'RELATIONSHIP_BUILDING': 'BEHAVIOR_SUPPORT',
            'COMMUNITY_ENGAGEMENT': 'COMMUNITY_ACCESS',
            'EMPLOYMENT_SUPPORT': 'BEHAVIOR_SUPPORT',
            'WORK_SKILLS': 'BEHAVIOR_SUPPORT',
            'JOB_SEEKING': 'BEHAVIOR_SUPPORT',
            'WORKPLACE_SUPPORT': 'BEHAVIOR_SUPPORT',
            'THERAPY_SERVICES': 'OT_SERVICES',
            'NURSING_SUPPORT': 'NURSING',
            'MENTAL_HEALTH': 'PSYCHOLOGY',
            'ASSISTIVE_TECHNOLOGY': 'OT_SERVICES',
            'COMMUNICATION_DEVICES': 'SPEECH_THERAPY',
            'MOBILITY_AIDS': 'PHYSIO_SERVICES',
            'HOME_MODIFICATIONS': 'OT_SERVICES'
        }
        
        # Try direct mapping first
        if support_type in SUPPORT_TO_PRICING_MAP:
            return SUPPORT_TO_PRICING_MAP[support_type]
        
        # Try to find matching pricing item using support form mappings
        for pricing_code, pricing_data in self._pricing_cache.items():
            meta = pricing_data.get('meta', {})
            mappings = meta.get('support_form_mappings', {})
            supported_types = mappings.get('support_types', [])
            
            if support_type in supported_types:
                return pricing_code
        
        logger.warning(f"No pricing mapping found for support type: {support_type}")
        return None
    
    def convert_duration_to_hours(self, duration_code: str, support_type: str = None) -> float:
        """Convert duration code to hours using dynamic data"""
        
        # Try duration from dynamic data first
        duration_data = self.get_dynamic_data('durations', duration_code)
        if duration_data and 'meta' in duration_data:
            meta = duration_data['meta']
            if 'hours' in meta:
                return float(meta['hours'])
        
        # Try support_durations as fallback
        support_duration_data = self.get_dynamic_data('support_durations', duration_code)
        if support_duration_data and 'meta' in support_duration_data:
            meta = support_duration_data['meta']
            if 'hours' in meta:
                return float(meta['hours'])
        
        # Try support-specific mappings
        if support_type:
            pricing_code = self.convert_support_to_pricing_code(support_type)
            if pricing_code:
                pricing_item = self.get_pricing_item(pricing_code)
                if pricing_item and 'meta' in pricing_item:
                    meta = pricing_item['meta']
                    mappings = meta.get('support_form_mappings', {})
                    conversions = mappings.get('duration_conversions', {})
                    
                    # Try to find matching duration label
                    duration_label = duration_data.get('label', '') if duration_data else ''
                    if duration_label in conversions:
                        return float(conversions[duration_label])
        
        # Fallback manual conversion
        DURATION_FALLBACKS = {
            '15_MIN': 0.25,
            '30_MIN': 0.5,
            '45_MIN': 0.75,
            '1_HOUR': 1,
            '1_5_HOUR': 1.5,
            '2_HOUR': 2,
            '2_HOURS': 2,
            '3_HOUR': 3,
            '3_HOURS': 3,
            '4_HOUR': 4,
            '4_HOURS': 4,
            '5_HOURS': 5,
            '6_HOURS': 6,
            '8_HOURS': 8,
            'HALF_DAY': 4,
            'FULL_DAY': 8,
            'OVERNIGHT': 12,
            '24_HOUR': 24,
            'SESSION': 1,
            'VISIT': 1,
            'ASSESSMENT': 2,
            'RESPITE_WEEKEND': 48
        }
        
        hours = DURATION_FALLBACKS.get(duration_code, 1)
        logger.info(f"Using fallback duration conversion: {duration_code} = {hours} hours")
        return float(hours)
    
    def get_frequency_multiplier(self, frequency_code: str, support_type: str = None) -> float:
        """Get frequency multiplier using dynamic data"""
        
        # Try frequency from dynamic data first
        frequency_data = self.get_dynamic_data('frequencies', frequency_code)
        if frequency_data and 'meta' in frequency_data:
            meta = frequency_data['meta']
            if 'multiplier' in meta:
                return float(meta['multiplier'])
        
        # Try support_frequencies as fallback
        support_frequency_data = self.get_dynamic_data('support_frequencies', frequency_code)
        if support_frequency_data:
            # For support_frequencies, we need to calculate multiplier
            # Daily = 7, Weekly = 1, etc.
            label = support_frequency_data['label'].lower()
            if 'daily' in label:
                return 7.0
            elif 'weekly' in label:
                return 1.0
            elif 'fortnightly' in label:
                return 0.5
            elif 'monthly' in label:
                return 0.25
        
        # Try support-specific mappings
        if support_type:
            pricing_code = self.convert_support_to_pricing_code(support_type)
            if pricing_code:
                pricing_item = self.get_pricing_item(pricing_code)
                if pricing_item and 'meta' in pricing_item:
                    meta = pricing_item['meta']
                    mappings = meta.get('support_form_mappings', {})
                    multipliers = mappings.get('frequency_multipliers', {})
                    
                    # Try to find matching frequency label
                    frequency_label = frequency_data.get('label', '') if frequency_data else ''
                    if frequency_label in multipliers:
                        return float(multipliers[frequency_label])
        
        # Fallback manual conversion
        FREQUENCY_FALLBACKS = {
            'ONE_OFF': 1,
            'DAILY': 7,
            'TWICE_DAILY': 14,
            'WEEKLY': 1,
            'TWICE_WEEKLY': 2,
            'THREE_WEEKLY': 3,
            'FORTNIGHTLY': 0.5,
            'MONTHLY': 0.25,
            'INTENSIVE': 5,
            'INTENSIVE_PERIOD': 5,
            'AS_NEEDED': 1,
            'REGULAR': 2,
            'ONGOING': 1,
            'SEASONAL': 0.25
        }
        
        multiplier = FREQUENCY_FALLBACKS.get(frequency_code, 1)
        logger.info(f"Using fallback frequency conversion: {frequency_code} = {multiplier}x multiplier")
        return float(multiplier)
    
    def calculate_staff_ratio_multiplier(self, staff_ratio_code: str) -> float:
        """Calculate cost multiplier based on staff ratio"""
        
        staff_ratio_data = self.get_dynamic_data('staff_ratios', staff_ratio_code)
        if staff_ratio_data and 'meta' in staff_ratio_data:
            meta = staff_ratio_data['meta']
            if 'cost_multiplier' in meta:
                return float(meta['cost_multiplier'])
        
        # Fallback multipliers
        RATIO_MULTIPLIERS = {
            'ONE_TO_ONE': 1.0,
            'ONE_TO_TWO': 0.6,
            'ONE_TO_THREE': 0.4,
            'ONE_TO_FOUR': 0.3,
            'ONE_TO_FIVE': 0.25,
            'TWO_TO_ONE': 2.0,
            'GROUP_SUPPORT': 0.5,
            'SUPERVISION_ONLY': 0.3,
            'REMOTE_SUPPORT': 0.4,
            'AS_REQUIRED': 1.0
        }
        
        return RATIO_MULTIPLIERS.get(staff_ratio_code, 1.0)
    
    def convert_support_item_to_quotation_item(self, support_item: Dict) -> Optional[Dict]:
        """Convert a care plan support item to a quotation item"""
        
        try:
            # Extract support item details
            support_type = support_item.get('type', '')
            frequency = support_item.get('frequency', 'WEEKLY')
            duration = support_item.get('duration', '1_HOUR')
            location = support_item.get('location', 'PARTICIPANT_HOME')
            staff_ratio = support_item.get('staffRatio', 'ONE_TO_ONE')
            notes = support_item.get('notes', '')
            provider = support_item.get('provider', '')
            
            logger.info(f"Converting support item: type={support_type}, frequency={frequency}, duration={duration}")
            
            # Convert support type to pricing code
            pricing_code = self.convert_support_to_pricing_code(support_type)
            if not pricing_code:
                logger.error(f"Cannot convert support type '{support_type}' to pricing code")
                return None
            
            # Get pricing data
            pricing_item = self.get_pricing_item(pricing_code)
            if not pricing_item:
                logger.error(f"No pricing data found for code: {pricing_code}")
                return None
            
            pricing_meta = pricing_item.get('meta', {})
            base_rate = pricing_meta.get('rate', 0)
            unit = pricing_meta.get('unit', 'hour')
            service_code = pricing_meta.get('service_code', '')
            category = pricing_meta.get('category', 'Core')
            description = pricing_meta.get('description', pricing_item.get('label', ''))
            
            if base_rate <= 0:
                logger.error(f"Invalid rate for pricing item {pricing_code}: {base_rate}")
                return None
            
            # Convert duration to hours/units
            hours = self.convert_duration_to_hours(duration, support_type)
            
            # Get frequency multiplier
            frequency_multiplier = self.get_frequency_multiplier(frequency, support_type)
            
            # Calculate staff ratio multiplier
            staff_multiplier = self.calculate_staff_ratio_multiplier(staff_ratio)
            
            # Calculate weekly quantity
            weekly_quantity = hours * frequency_multiplier
            
            # Apply staff ratio to rate
            adjusted_rate = Decimal(str(base_rate)) * Decimal(str(staff_multiplier))
            
            # Calculate weekly cost
            weekly_cost = weekly_quantity * adjusted_rate
            
            # Round to 2 decimal places
            weekly_cost = weekly_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            adjusted_rate = adjusted_rate.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Build description with details
            location_data = self.get_dynamic_data('support_locations', location)
            location_label = location_data.get('label', location) if location_data else location
            
            staff_ratio_data = self.get_dynamic_data('staff_ratios', staff_ratio)
            staff_ratio_label = staff_ratio_data.get('label', staff_ratio) if staff_ratio_data else staff_ratio
            
            frequency_data = self.get_dynamic_data('frequencies', frequency) or self.get_dynamic_data('support_frequencies', frequency)
            frequency_label = frequency_data.get('label', frequency) if frequency_data else frequency
            
            duration_data = self.get_dynamic_data('durations', duration) or self.get_dynamic_data('support_durations', duration)
            duration_label = duration_data.get('label', duration) if duration_data else duration
            
            full_description = f"{description} - {duration_label} {frequency_label} at {location_label} ({staff_ratio_label})"
            if notes:
                full_description += f" - {notes}"
            
            # Create quotation item
            quotation_item = {
                'service_code': service_code,
                'description': full_description,
                'quantity': float(weekly_quantity),
                'unit': unit,
                'unit_price': float(adjusted_rate),
                'total_price': float(weekly_cost),
                'category': category,
                'provider': provider or 'TBD',
                'notes': notes,
                'meta': {
                    'support_type': support_type,
                    'frequency': frequency,
                    'duration': duration,
                    'location': location,
                    'staff_ratio': staff_ratio,
                    'hours_per_session': hours,
                    'frequency_multiplier': frequency_multiplier,
                    'staff_multiplier': staff_multiplier,
                    'base_rate': float(base_rate),
                    'pricing_code': pricing_code,
                    'calculation_breakdown': {
                        'base_rate': float(base_rate),
                        'hours_per_session': hours,
                        'frequency_multiplier': frequency_multiplier,
                        'staff_multiplier': staff_multiplier,
                        'weekly_hours': weekly_quantity,
                        'adjusted_rate': float(adjusted_rate),
                        'weekly_cost': float(weekly_cost)
                    }
                }
            }
            
            logger.info(f"Successfully converted support item to quotation item: {pricing_code} = ${weekly_cost}/week")
            return quotation_item
            
        except Exception as e:
            logger.error(f"Error converting support item: {str(e)}")
            return None
    
    def generate_quotation_from_care_plan(self, participant_id: int, care_plan_id: Optional[int] = None) -> Dict:
        """Generate a quotation from a participant's active care plan"""
        
        try:
            # Get participant
            participant = self.db.query(Participant).filter(Participant.id == participant_id).first()
            if not participant:
                raise QuotationGenerationError(f"Participant {participant_id} not found")
            
            # Get care plan
            if care_plan_id:
                care_plan = self.db.query(CarePlan).filter(
                    CarePlan.id == care_plan_id,
                    CarePlan.participant_id == participant_id
                ).first()
            else:
                # Get most recent active care plan
                care_plan = self.db.query(CarePlan).filter(
                    CarePlan.participant_id == participant_id,
                    CarePlan.status == 'ACTIVE'
                ).order_by(CarePlan.created_at.desc()).first()
            
            if not care_plan:
                raise QuotationGenerationError(f"No active care plan found for participant {participant_id}")
            
            logger.info(f"Generating quotation from care plan {care_plan.id} for participant {participant_id}")
            
            # Parse support items from care plan
            care_plan_data = care_plan.plan_data or {}
            support_items = care_plan_data.get('supports', [])
            
            if not support_items:
                raise QuotationGenerationError("No support items found in care plan")
            
            # Convert support items to quotation items
            quotation_items = []
            invalid_items = []
            
            for i, support_item in enumerate(support_items):
                logger.info(f"Processing support item {i + 1}: {support_item}")
                
                quotation_item = self.convert_support_item_to_quotation_item(support_item)
                
                if quotation_item:
                    quotation_items.append(quotation_item)
                else:
                    invalid_items.append(f"Support {i + 1} invalid, skipping: {support_item}")
                    logger.warning(f"Support {i + 1} invalid, skipping: {support_item}")
            
            if not quotation_items:
                error_msg = f"No valid support items could be converted to billable format"
                if invalid_items:
                    error_msg += f". Invalid items: {'; '.join(invalid_items)}"
                raise QuotationGenerationError(error_msg)
            
            # Calculate totals
            total_weekly_cost = sum(Decimal(str(item['total_price'])) for item in quotation_items)
            total_monthly_cost = total_weekly_cost * Decimal('4.33')  # Average weeks per month
            total_annual_cost = total_weekly_cost * Decimal('52')
            
            # Round totals
            total_weekly_cost = total_weekly_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_monthly_cost = total_monthly_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_annual_cost = total_annual_cost.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Build quotation
            quotation_data = {
                'participant_id': participant_id,
                'participant_name': f"{participant.first_name} {participant.last_name}",
                'care_plan_id': care_plan.id,
                'quotation_number': f"QUO-{participant_id}-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
                'status': 'DRAFT',
                'valid_from': datetime.now().date(),
                'valid_until': (datetime.now() + timedelta(days=90)).date(),
                'items': quotation_items,
                'summary': {
                    'total_items': len(quotation_items),
                    'invalid_items': len(invalid_items),
                    'weekly_cost': float(total_weekly_cost),
                    'monthly_cost': float(total_monthly_cost),
                    'annual_cost': float(total_annual_cost),
                    'categories': list(set(item['category'] for item in quotation_items))
                },
                'meta': {
                    'generated_at': datetime.now().isoformat(),
                    'generated_from': f"care_plan_{care_plan.id}",
                    'invalid_items': invalid_items,
                    'participant_details': {
                        'ndis_number': participant.ndis_number,
                        'plan_type': participant.plan_type,
                        'support_category': participant.support_category
                    }
                }
            }
            
            logger.info(f"Successfully generated quotation with {len(quotation_items)} items, total: ${total_weekly_cost}/week")
            
            return quotation_data
            
        except QuotationGenerationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error generating quotation: {str(e)}")
            raise QuotationGenerationError(f"Failed to generate quotation: {str(e)}")
    
    def save_quotation_to_database(self, quotation_data: Dict) -> Quotation:
        """Save generated quotation to database"""
        
        try:
            # Create quotation record
            quotation = Quotation(
                participant_id=quotation_data['participant_id'],
                quotation_number=quotation_data['quotation_number'],
                status=quotation_data['status'],
                valid_from=quotation_data['valid_from'],
                valid_until=quotation_data['valid_until'],
                total_amount=Decimal(str(quotation_data['summary']['weekly_cost'])),
                meta=quotation_data.get('meta', {}),
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            
            self.db.add(quotation)
            self.db.flush()  # Get the ID
            
            # Create quotation items
            for item_data in quotation_data['items']:
                quotation_item = QuotationItem(
                    quotation_id=quotation.id,
                    service_code=item_data['service_code'],
                    description=item_data['description'],
                    quantity=Decimal(str(item_data['quantity'])),
                    unit=item_data['unit'],
                    unit_price=Decimal(str(item_data['unit_price'])),
                    total_price=Decimal(str(item_data['total_price'])),
                    category=item_data['category'],
                    provider=item_data.get('provider', ''),
                    notes=item_data.get('notes', ''),
                    meta=item_data.get('meta', {})
                )
                self.db.add(quotation_item)
            
            self.db.commit()
            
            logger.info(f"Saved quotation {quotation.quotation_number} to database with ID {quotation.id}")
            return quotation
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to save quotation to database: {str(e)}")
            raise QuotationGenerationError(f"Failed to save quotation: {str(e)}")

# Service functions for API endpoints
def generate_quotation_from_care_plan(db: Session, participant_id: int, care_plan_id: Optional[int] = None) -> Dict:
    """Generate quotation from care plan - main API function"""
    service = DynamicDataQuotationService(db)
    return service.generate_quotation_from_care_plan(participant_id, care_plan_id)

def generate_and_save_quotation_from_care_plan(db: Session, participant_id: int, care_plan_id: Optional[int] = None) -> Quotation:
    """Generate and save quotation from care plan"""
    service = DynamicDataQuotationService(db)
    quotation_data = service.generate_quotation_from_care_plan(participant_id, care_plan_id)
    return service.save_quotation_to_database(quotation_data)

def list_by_participant(db: Session, participant_id: int) -> List[Quotation]:
    """List all quotations for a participant - API function"""
    try:
        quotations = db.query(Quotation).filter(
            Quotation.participant_id == participant_id
        ).order_by(Quotation.created_at.desc()).all()
        
        logger.info(f"Found {len(quotations)} quotations for participant {participant_id}")
        return quotations
        
    except Exception as e:
        logger.error(f"Error listing quotations for participant {participant_id}: {str(e)}")
        raise

def get_quotation(db: Session, quotation_id: int) -> Optional[Quotation]:
    """Get a specific quotation by ID"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        return quotation
    except Exception as e:
        logger.error(f"Error getting quotation {quotation_id}: {str(e)}")
        raise

def delete_quotation(db: Session, quotation_id: int) -> bool:
    """Delete a quotation"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if quotation:
            db.delete(quotation)
            db.commit()
            logger.info(f"Deleted quotation {quotation_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error deleting quotation {quotation_id}: {str(e)}")
        db.rollback()
        raise

def update_quotation_status(db: Session, quotation_id: int, status: str) -> Optional[Quotation]:
    """Update quotation status"""
    try:
        quotation = db.query(Quotation).filter(Quotation.id == quotation_id).first()
        if quotation:
            quotation.status = status
            quotation.updated_at = datetime.now()
            db.commit()
            logger.info(f"Updated quotation {quotation_id} status to {status}")
            return quotation
        return None
    except Exception as e:
        logger.error(f"Error updating quotation {quotation_id} status: {str(e)}")
        db.rollback()
        raise

# Utility functions for testing and debugging
def validate_support_item_conversion(db: Session, support_item: Dict) -> Dict:
    """Validate a single support item conversion - for testing"""
    service = DynamicDataQuotationService(db)
    result = service.convert_support_item_to_quotation_item(support_item)
    return {
        'valid': result is not None,
        'quotation_item': result,
        'support_item': support_item
    }

def get_available_pricing_mappings(db: Session) -> Dict:
    """Get all available support type to pricing mappings - for debugging"""
    service = DynamicDataQuotationService(db)
    
    mappings = {}
    for support_type in service._dynamic_data_cache.get('support_types', {}):
        pricing_code = service.convert_support_to_pricing_code(support_type)
        if pricing_code:
            pricing_item = service.get_pricing_item(pricing_code)
            mappings[support_type] = {
                'pricing_code': pricing_code,
                'pricing_item': pricing_item
            }
    
    return mappings

def get_quotation_service_summary(db: Session) -> Dict:
    """Get summary of quotation service capabilities"""
    service = DynamicDataQuotationService(db)
    
    return {
        'pricing_items_loaded': len(service._pricing_cache),
        'dynamic_data_types': list(service._dynamic_data_cache.keys()),
        'total_dynamic_entries': sum(len(items) for items in service._dynamic_data_cache.values()),
        'available_support_mappings': len([
            support_type for support_type in service._dynamic_data_cache.get('support_types', {})
            if service.convert_support_to_pricing_code(support_type)
        ]),
        'service_initialized': True
    }

if __name__ == "__main__":
    # Test script for validation
    print("Dynamic Data Quotation Service - Test Script")
    print("=" * 50)
    
    # Sample support item for testing
    test_support_item = {
        'type': 'RESPITE_CARE',
        'frequency': 'INTENSIVE_PERIOD',
        'duration': 'HALF_DAY',
        'location': 'ACCOMMODATION_FACILITY',
        'staffRatio': 'ONE_TO_ONE',
        'notes': 'Weekend respite support',
        'cost': '',
        'provider': ''
    }
    
    print(f"Test support item: {test_support_item}")
    print("\nTo test conversion, use:")
    print("validate_support_item_conversion(db, test_support_item)")
    print("\nTo generate quotation, use:")
    print("generate_quotation_from_care_plan(db, participant_id)")