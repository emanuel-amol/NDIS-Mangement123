# backend/app/services/seed_dynamic_data.py - COMPLETE SRS COMPLIANT VERSION
from sqlalchemy.orm import Session
from app.models.dynamic_data import DynamicData

# All data types from SRS requirements
BASE_SEEDS = {
    # Contact Methods (SRS section 14.1.1.2)
    "contact_methods": [
        ("PHONE", "Phone Call"),
        ("SMS", "SMS/Text Message"),
        ("EMAIL", "Email"),
        ("IN_PERSON", "In Person"),
        ("VIDEO_CALL", "Video Call"),
        ("MAIL", "Mail/Post")
    ],
    
    # Disabilities (SRS section 14.1.11.6)
    "disability_types": [
        ("PHYSICAL", "Physical Disability"),
        ("INTELLECTUAL", "Intellectual Disability"),
        ("SENSORY", "Sensory Disability"),
        ("MENTAL_HEALTH", "Mental Health Condition"),
        ("NEUROLOGICAL", "Neurological Condition"),
        ("AUTISM", "Autism Spectrum Disorder"),
        ("MULTIPLE", "Multiple Disabilities"),
        ("ACQUIRED_BRAIN_INJURY", "Acquired Brain Injury"),
        ("LEARNING_DISABILITY", "Learning Disability"),
        ("DEVELOPMENTAL_DELAY", "Developmental Delay")
    ],
    
    # Genders (SRS section 14.1.17)
    "genders": [
        ("MALE", "Male"),
        ("FEMALE", "Female"),
        ("NON_BINARY", "Non-binary"),
        ("PREFER_NOT_TO_SAY", "Prefer not to say"),
        ("OTHER", "Other")
    ],
    
    # Relationship Types (SRS section 14.1.11.9)
    "relationship_types": [
        ("PARENT", "Parent"),
        ("GUARDIAN", "Guardian"),
        ("SPOUSE", "Spouse/Partner"),
        ("SIBLING", "Sibling"),
        ("CHILD", "Child"),
        ("FRIEND", "Friend"),
        ("CARER", "Carer"),
        ("CASE_MANAGER", "Case Manager"),
        ("SUPPORT_COORDINATOR", "Support Coordinator"),
        ("ADVOCATE", "Advocate"),
        ("FAMILY_MEMBER", "Family Member"),
        ("LEGAL_GUARDIAN", "Legal Guardian")
    ],
    
    # Service Types (SRS section 14.1.11 and 14.1.12)
    "service_types": [
        ("PERSONAL_CARE", "Personal Care"),
        ("DOMESTIC_ASSISTANCE", "Domestic Assistance"),
        ("COMMUNITY_ACCESS", "Community Access"),
        ("TRANSPORT", "Transport"),
        ("RESPITE_CARE", "Respite Care"),
        ("SIL", "Supported Independent Living"),
        ("THERAPY_SERVICES", "Therapy Services"),
        ("BEHAVIOR_SUPPORT", "Behavior Support"),
        ("EMPLOYMENT_SUPPORT", "Employment Support"),
        ("EDUCATION_SUPPORT", "Education Support"),
        ("SOCIAL_PARTICIPATION", "Social and Community Participation"),
        ("CAPACITY_BUILDING", "Capacity Building"),
        ("CORE_SUPPORTS", "Core Supports"),
        ("CAPITAL_SUPPORTS", "Capital Supports")
    ],
    
    # Support Categories (SRS section 14.1.11)
    "support_categories": [
        ("CORE_SUPPORT", "Core Support"),
        ("CAPITAL_SUPPORT", "Capital Support"),
        ("CAPACITY_BUILDING", "Capacity Building Support"),
        ("DAILY_LIVING", "Assistance with Daily Living"),
        ("TRANSPORT", "Transport"),
        ("SOCIAL_COMMUNITY", "Social and Community Participation"),
        ("EMPLOYMENT", "Employment Support"),
        ("ACCOMMODATION", "Accommodation Support"),
        ("ASSISTIVE_TECHNOLOGY", "Assistive Technology"),
        ("HOME_MODIFICATIONS", "Home Modifications")
    ],
    
    # Plan Types (SRS section 14.1.11.4)
    "plan_types": [
        ("SELF_MANAGED", "Self-Managed"),
        ("PLAN_MANAGED", "Plan-Managed"),
        ("AGENCY_MANAGED", "Agency-Managed"),
        ("COMBINATION", "Combination")
    ],
    
    # Urgency Levels (SRS referral requirements)
    "urgency_levels": [
        ("LOW", "Low"),
        ("MEDIUM", "Medium"),
        ("HIGH", "High"),
        ("URGENT", "Urgent")
    ],
    
    # Referrer Roles (SRS referral requirements)
    "referrer_roles": [
        ("DOCTOR_GP", "Doctor/GP"),
        ("SPECIALIST", "Specialist"),
        ("SOCIAL_WORKER", "Social Worker"),
        ("OT", "Occupational Therapist"),
        ("PHYSIO", "Physiotherapist"),
        ("PSYCHOLOGIST", "Psychologist"),
        ("CASE_MANAGER", "Case Manager"),
        ("SUPPORT_COORDINATOR", "Support Coordinator"),
        ("FAMILY_MEMBER", "Family Member"),
        ("SELF_REFERRAL", "Self-Referral"),
        ("HOSPITAL", "Hospital"),
        ("COMMUNITY_HEALTH", "Community Health Service"),
        ("EARLY_INTERVENTION", "Early Intervention Service"),
        ("SCHOOL", "School/Education Provider"),
        ("GOVERNMENT_AGENCY", "Government Agency")
    ],
    
    # Likes (SRS section 14.1.11.6)
    "likes": [
        ("MUSIC", "Music"),
        ("SPORTS", "Sports"),
        ("READING", "Reading"),
        ("MOVIES", "Movies/TV"),
        ("COOKING", "Cooking"),
        ("GARDENING", "Gardening"),
        ("ANIMALS", "Animals/Pets"),
        ("ART_CRAFTS", "Arts and Crafts"),
        ("TECHNOLOGY", "Technology/Computers"),
        ("OUTDOOR_ACTIVITIES", "Outdoor Activities"),
        ("BOARD_GAMES", "Board Games"),
        ("DANCING", "Dancing"),
        ("SWIMMING", "Swimming"),
        ("SHOPPING", "Shopping"),
        ("SOCIALIZING", "Socializing")
    ],
    
    # Dislikes (SRS section 14.1.11.6)
    "dislikes": [
        ("LOUD_NOISES", "Loud Noises"),
        ("CROWDS", "Crowds"),
        ("CERTAIN_FOODS", "Certain Foods"),
        ("HEIGHTS", "Heights"),
        ("CONFINED_SPACES", "Confined Spaces"),
        ("SUDDEN_CHANGES", "Sudden Changes"),
        ("BRIGHT_LIGHTS", "Bright Lights"),
        ("STRONG_SMELLS", "Strong Smells"),
        ("PHYSICAL_CONTACT", "Physical Contact"),
        ("WAITING", "Waiting"),
        ("CRITICISM", "Criticism"),
        ("UNFAMILIAR_PLACES", "Unfamiliar Places"),
        ("CERTAIN_TEXTURES", "Certain Textures"),
        ("INTERRUPTIONS", "Interruptions"),
        ("CONFLICT", "Conflict")
    ],
    
    # Vaccinations (SRS section 14.1.11.8)
    "vaccinations": [
        ("COVID19", "COVID-19"),
        ("INFLUENZA", "Influenza (Flu)"),
        ("PNEUMOCOCCAL", "Pneumococcal"),
        ("HEPATITIS_A", "Hepatitis A"),
        ("HEPATITIS_B", "Hepatitis B"),
        ("MMR", "MMR (Measles, Mumps, Rubella)"),
        ("TETANUS", "Tetanus"),
        ("WHOOPING_COUGH", "Whooping Cough (Pertussis)"),
        ("VARICELLA", "Varicella (Chickenpox)"),
        ("HPV", "HPV (Human Papillomavirus)"),
        ("MENINGOCOCCAL", "Meningococcal"),
        ("SHINGLES", "Shingles (Zoster)")
    ],
    
    # Qualifications (SRS section 14.1.10.3)
    "qualifications": [
        ("CERT_III_INDIVIDUAL_SUPPORT", "Certificate III in Individual Support"),
        ("CERT_III_AGED_CARE", "Certificate III in Aged Care"),
        ("CERT_III_DISABILITY", "Certificate III in Disability"),
        ("CERT_IV_MENTAL_HEALTH", "Certificate IV in Mental Health"),
        ("MANUAL_HANDLING", "Manual Handling"),
        ("MEDICATION_CERTIFICATE", "Medication Certificate"),
        ("FIRST_AID", "First Aid"),
        ("CPR", "CPR"),
        ("NDIS_WORKER_ORIENTATION", "NDIS Worker Orientation Module"),
        ("EFFECTIVE_COMMUNICATION", "Supporting Effective Communication"),
        ("SAFE_MEALS", "Supporting Safe and Enjoyable Meals"),
        ("WORKER_SCREENING", "NDIS Worker Screening"),
        ("WORKING_WITH_CHILDREN", "Working with Children Check"),
        ("POLICE_CHECK", "Police Check"),
        ("DRIVERS_LICENSE", "Australian Driver's License")
    ],
    
    # Pricing Items (SRS section 14.1.16)
    "pricing_items": [
        ("DOMESTIC_ASSISTANCE", "Domestic Assistance"),
        ("PERSONAL_CARE", "Personal Care"),
        ("COMMUNITY_ACCESS", "Community Access"),
        ("TRANSPORT", "Transport"),
        ("RESPITE_CARE", "Respite Care"),
        ("SIL_SUPPORT", "SIL Support"),
        ("BEHAVIOR_SUPPORT", "Behavior Support Practitioner"),
        ("OT_SERVICES", "Occupational Therapy"),
        ("PHYSIO_SERVICES", "Physiotherapy"),
        ("SPEECH_THERAPY", "Speech Therapy"),
        ("PSYCHOLOGY", "Psychology Services"),
        ("SOCIAL_WORK", "Social Work"),
        ("DIETITIAN", "Dietitian Services"),
        ("EXERCISE_PHYSIOLOGY", "Exercise Physiology"),
        ("NURSING", "Nursing Services")
    ]
}

# Pricing metadata for pricing items (SRS section 14.1.16)
PRICING_META = {
    "DOMESTIC_ASSISTANCE": {"service_code": "01_011_0107_1_1", "unit": "hour", "rate": 70.21},
    "PERSONAL_CARE": {"service_code": "01_013_0107_1_1", "unit": "hour", "rate": 70.21},
    "COMMUNITY_ACCESS": {"service_code": "01_015_0107_1_1", "unit": "hour", "rate": 70.21},
    "TRANSPORT": {"service_code": "01_016_0107_1_1", "unit": "hour", "rate": 70.21},
    "RESPITE_CARE": {"service_code": "01_012_0107_1_1", "unit": "hour", "rate": 70.21},
    "SIL_SUPPORT": {"service_code": "01_014_0107_1_1", "unit": "hour", "rate": 70.21},
    "BEHAVIOR_SUPPORT": {"service_code": "15_052_0128_1_1", "unit": "hour", "rate": 193.99},
    "OT_SERVICES": {"service_code": "15_054_0128_1_1", "unit": "hour", "rate": 193.99},
    "PHYSIO_SERVICES": {"service_code": "15_055_0128_1_1", "unit": "hour", "rate": 193.99},
    "SPEECH_THERAPY": {"service_code": "15_056_0128_1_1", "unit": "hour", "rate": 193.99},
    "PSYCHOLOGY": {"service_code": "15_057_0128_1_1", "unit": "hour", "rate": 214.41},
    "SOCIAL_WORK": {"service_code": "15_058_0128_1_1", "unit": "hour", "rate": 163.56},
    "DIETITIAN": {"service_code": "15_059_0128_1_1", "unit": "hour", "rate": 193.99},
    "EXERCISE_PHYSIOLOGY": {"service_code": "15_060_0128_1_1", "unit": "hour", "rate": 166.99},
    "NURSING": {"service_code": "15_061_0128_1_1", "unit": "hour", "rate": 163.56}
}

def upsert_seed(db: Session, dtype: str, code: str, label: str, meta: dict | None = None):
    """Upsert (insert or update) a dynamic data entry"""
    obj = db.query(DynamicData).filter(DynamicData.type == dtype, DynamicData.code == code).first()
    if not obj:
        obj = DynamicData(type=dtype, code=code, label=label, is_active=True, meta=meta)
        db.add(obj)
    else:
        obj.label = label
        obj.is_active = True  # Ensure existing items are active
        if meta is not None:
            obj.meta = meta

def run(db: Session) -> None:
    """Run the dynamic data seeding process"""
    print("🌱 Seeding dynamic data...")
    
    total_entries = 0
    for dtype, entries in BASE_SEEDS.items():
        print(f"  📊 Seeding {dtype} ({len(entries)} entries)")
        for code, label in entries:
            meta = None
            if dtype == "pricing_items":
                meta = PRICING_META.get(code)
            upsert_seed(db, dtype, code, label, meta)
            total_entries += 1
    
    try:
        db.commit()
        print(f"✅ Successfully seeded {total_entries} dynamic data entries across {len(BASE_SEEDS)} types")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding dynamic data: {e}")
        raise

def get_seed_summary() -> dict:
    """Get a summary of what will be seeded"""
    return {
        "types": list(BASE_SEEDS.keys()),
        "total_entries": sum(len(entries) for entries in BASE_SEEDS.values()),
        "entries_per_type": {dtype: len(entries) for dtype, entries in BASE_SEEDS.items()}
    }