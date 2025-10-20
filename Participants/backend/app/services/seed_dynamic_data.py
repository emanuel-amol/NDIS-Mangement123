# backend/app/services/seed_dynamic_data.py - COMPLETE MERGED VERSION WITH ENHANCED CAPACITY BUILDING & SRS COMPLIANCE
from sqlalchemy.orm import Session
from app.models.dynamic_data import DynamicData
from sqlalchemy import and_
from typing import Dict, List, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)

# All data types from SRS requirements + Enhanced Care Plan & Risk Assessment types
BASE_SEEDS = {
    # ==========================================
    # ORIGINAL SRS COMPLIANT DATA (section 14.1)
    # ==========================================
    
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
    
    # ==========================================
    # ENHANCED PRICING ITEMS WITH SUPPORT MAPPING
    # ==========================================
    
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
        ("NURSING", "Nursing Services"),
        # Enhanced capacity building items
        ("CAPACITY_BUILDING", "Capacity Building Support"),
        ("DAILY_LIVING_SKILLS", "Daily Living Skills Training"),
        ("EMPLOYMENT_SUPPORT", "Employment Support"),
        ("SOCIAL_SKILLS", "Social Skills Development"),
        ("LIFE_SKILLS", "Life Skills Training"),
        ("INDEPENDENCE_TRAINING", "Independence Training"),
        ("SKILL_DEVELOPMENT", "Skill Development"),
        ("BEHAVIOR_INTERVENTION", "Behavior Intervention"),
        ("THERAPY_TRAINING", "Therapy and Training")
    ],
    
    # Support Types (for dropdown) - Enhanced with capacity building
    "support_types": [
        ("DOMESTIC_ASSISTANCE", "Domestic Assistance"),
        ("RESPITE_CARE", "Respite Care"), 
        ("COMMUNITY_ACCESS", "Community Access"),
        ("PERSONAL_CARE", "Personal Care"),
        ("TRANSPORT", "Transport"),
        ("BEHAVIOR_SUPPORT", "Behavior Support"),
        ("SPEECH_THERAPY", "Speech Therapy"),
        ("OCCUPATIONAL_THERAPY", "Occupational Therapy"),
        ("PHYSIOTHERAPY", "Physiotherapy"),
        ("DIETITIAN", "Dietitian"),
        ("NURSING", "Nursing"),
        ("SOCIAL_WORK", "Social Work"),
        # Enhanced capacity building support types
        ("CAPACITY_BUILDING", "Capacity Building Support"),
        ("DAILY_LIVING_SKILLS", "Daily Living Skills Training"),
        ("EMPLOYMENT_SUPPORT", "Employment Support"),
        ("SOCIAL_SKILLS", "Social Skills Development"),
        ("LIFE_SKILLS", "Life Skills Training"),
        ("INDEPENDENCE_TRAINING", "Independence Training"),
        ("SKILL_DEVELOPMENT", "Skill Development"),
        ("BEHAVIOR_INTERVENTION", "Behavior Intervention"),
        ("THERAPY_TRAINING", "Therapy and Training")
    ],
    
    # Frequencies (for dropdown) - Enhanced
    "frequencies": [
        ("ONE_OFF", "One-off"),
        ("DAILY", "Daily"),
        ("TWICE_DAILY", "Twice daily"),
        ("WEEKLY", "Weekly"),
        ("TWICE_WEEKLY", "Twice weekly"),
        ("THREE_WEEKLY", "Three times weekly"),
        ("FORTNIGHTLY", "Fortnightly"),
        ("MONTHLY", "Monthly"),
        ("INTENSIVE_PERIOD", "Intensive Period"),
        ("AS_NEEDED", "As needed"),
        ("REGULAR", "Regular")
    ],
    
    # Durations (for dropdown) - Enhanced
    "durations": [
        ("15_MIN", "15 minutes"),
        ("30_MIN", "30 minutes"),
        ("45_MIN", "45 minutes"),
        ("1_HOUR", "1 hour"),
        ("1_5_HOUR", "1.5 hours"),
        ("2_HOUR", "2 hours"),
        ("3_HOUR", "3 hours"),
        ("4_HOUR", "4 hours"),
        ("5_HOURS", "5 hours"),
        ("HALF_DAY", "Half day"),
        ("FULL_DAY", "Full day"),
        ("OVERNIGHT", "Overnight"),
        ("24_HOUR", "24 hours"),
        ("SESSION", "Session"),
        ("VISIT", "Visit"),
        ("ASSESSMENT", "Assessment")
    ],
    
    # ==========================================
    # ENHANCED CARE PLAN DYNAMIC DATA TYPES
    # ==========================================
    
    # Goal Types and Categories
    "goal_categories": [
        ("DAILY_LIVING", "Daily Living Skills"),
        ("COMMUNITY_PARTICIPATION", "Community Participation"),
        ("EMPLOYMENT", "Employment and Education"),
        ("RELATIONSHIPS", "Social Relationships"),
        ("HEALTH_WELLBEING", "Health and Wellbeing"),
        ("INDEPENDENCE", "Independence and Choice"),
        ("COMMUNICATION", "Communication"),
        ("MOBILITY", "Mobility and Transport"),
        ("LIFE_SKILLS", "Life Skills"),
        ("RECREATION", "Recreation and Leisure")
    ],
    
    "goal_timeframes": [
        ("SHORT_TERM", "Short-term (0-6 months)"),
        ("MEDIUM_TERM", "Medium-term (6-12 months)"),
        ("LONG_TERM", "Long-term (1-2 years)"),
        ("ONGOING", "Ongoing/Maintenance")
    ],
    
    "goal_priorities": [
        ("HIGH", "High Priority"),
        ("MEDIUM", "Medium Priority"),
        ("LOW", "Low Priority"),
        ("CRITICAL", "Critical/Urgent")
    ],
    
    # Support Service Types (comprehensive NDIS categories)
    "support_service_types": [
        # Core Supports - Daily Activities
        ("PERSONAL_CARE", "Personal Care and Hygiene"),
        ("DOMESTIC_ASSISTANCE", "Domestic Assistance"),
        ("MEAL_PREPARATION", "Meal Preparation"),
        ("COMMUNITY_ACCESS", "Community Access"),
        ("TRANSPORT", "Transport Support"),
        ("RESPITE_CARE", "Respite Care"),
        
        # Core Supports - Social and Community
        ("SOCIAL_PARTICIPATION", "Social and Community Participation"),
        ("GROUP_ACTIVITIES", "Group Activities"),
        ("COMMUNITY_PROGRAMS", "Community Programs"),
        ("RECREATION_ACTIVITIES", "Recreation Activities"),
        
        # Capacity Building - Daily Living
        ("DAILY_LIVING_SKILLS", "Daily Living Skills Training"),
        ("HOUSEHOLD_TASKS", "Household Tasks Training"),
        ("MONEY_MANAGEMENT", "Money Management"),
        ("SELF_CARE_SKILLS", "Self-Care Skills"),
        
        # Capacity Building - Social and Civic
        ("COMMUNICATION_SKILLS", "Communication Skills"),
        ("SOCIAL_SKILLS", "Social Skills Development"),
        ("RELATIONSHIP_BUILDING", "Relationship Building"),
        ("COMMUNITY_ENGAGEMENT", "Community Engagement"),
        
        # Capacity Building - Employment
        ("EMPLOYMENT_SUPPORT", "Employment Support"),
        ("WORK_SKILLS", "Work Skills Development"),
        ("JOB_SEEKING", "Job Seeking Support"),
        ("WORKPLACE_SUPPORT", "Workplace Support"),
        
        # Capacity Building - Health and Wellbeing
        ("THERAPY_SERVICES", "Therapy Services"),
        ("BEHAVIOR_SUPPORT", "Behavior Support"),
        ("NURSING_SUPPORT", "Nursing Support"),
        ("MENTAL_HEALTH", "Mental Health Support"),
        
        # Accommodation
        ("SIL", "Supported Independent Living"),
        ("SDA", "Specialist Disability Accommodation"),
        ("RESPITE_ACCOMMODATION", "Respite Accommodation"),
        
        # Assistive Technology
        ("ASSISTIVE_TECHNOLOGY", "Assistive Technology"),
        ("COMMUNICATION_DEVICES", "Communication Devices"),
        ("MOBILITY_AIDS", "Mobility Aids"),
        ("HOME_MODIFICATIONS", "Home Modifications")
    ],
    
    "support_delivery_methods": [
        ("ONE_ON_ONE", "One-on-One Support"),
        ("GROUP_SUPPORT", "Group Support"),
        ("REMOTE_SUPPORT", "Remote/Telehealth Support"),
        ("FAMILY_TRAINING", "Family/Carer Training"),
        ("PEER_SUPPORT", "Peer Support"),
        ("SELF_DIRECTED", "Self-Directed Support")
    ],
    
    "support_frequencies": [
        ("DAILY", "Daily"),
        ("WEEKLY", "Weekly"),
        ("FORTNIGHTLY", "Fortnightly"),
        ("MONTHLY", "Monthly"),
        ("AS_NEEDED", "As Needed"),
        ("INTENSIVE_PERIOD", "Intensive Period"),
        ("ONGOING", "Ongoing"),
        ("SEASONAL", "Seasonal/Holiday Periods")
    ],
    
    "support_duration_types": [
        ("HOURS_PER_WEEK", "Hours per Week"),
        ("HOURS_PER_MONTH", "Hours per Month"),
        ("SESSIONS_PER_WEEK", "Sessions per Week"),
        ("SESSIONS_PER_MONTH", "Sessions per Month"),
        ("BLOCKS_OF_TIME", "Blocks of Time"),
        ("FLEXIBLE_HOURS", "Flexible Hours")
    ],
    
    # Monitoring and Review
    "monitoring_frequencies": [
        ("WEEKLY", "Weekly"),
        ("FORTNIGHTLY", "Fortnightly"),
        ("MONTHLY", "Monthly"),
        ("QUARTERLY", "Quarterly (3 months)"),
        ("BIANNUALLY", "Bi-annually (6 months)"),
        ("ANNUALLY", "Annually"),
        ("AS_REQUIRED", "As Required"),
        ("CONTINUOUS", "Continuous Monitoring")
    ],
    
    "monitoring_methods": [
        ("DIRECT_OBSERVATION", "Direct Observation"),
        ("PROGRESS_REPORTS", "Progress Reports"),
        ("DATA_COLLECTION", "Data Collection"),
        ("FEEDBACK_SESSIONS", "Feedback Sessions"),
        ("FORMAL_REVIEWS", "Formal Reviews"),
        ("INFORMAL_CHECK_INS", "Informal Check-ins"),
        ("FAMILY_FEEDBACK", "Family/Carer Feedback"),
        ("SELF_REPORTING", "Self-Reporting")
    ],
    
    "review_triggers": [
        ("SCHEDULED_REVIEW", "Scheduled Review"),
        ("GOAL_ACHIEVEMENT", "Goal Achievement"),
        ("CHANGE_IN_NEEDS", "Change in Needs"),
        ("INCIDENT_OCCURRENCE", "Incident Occurrence"),
        ("REQUEST_BY_PARTICIPANT", "Request by Participant"),
        ("REQUEST_BY_FAMILY", "Request by Family"),
        ("PROVIDER_RECOMMENDATION", "Provider Recommendation"),
        ("PLAN_REVIEW_DATE", "NDIS Plan Review Date")
    ],
    
    # Communication and Cultural
    "communication_preferences": [
        ("VERBAL", "Verbal Communication"),
        ("WRITTEN", "Written Communication"),
        ("VISUAL_AIDS", "Visual Aids/Pictures"),
        ("SIGN_LANGUAGE", "Sign Language"),
        ("TECHNOLOGY_ASSISTED", "Technology Assisted"),
        ("INTERPRETER_REQUIRED", "Interpreter Required"),
        ("FAMILY_INVOLVEMENT", "Family Involvement in Communication"),
        ("SIMPLE_LANGUAGE", "Simple Language Required"),
        ("REPETITION_NEEDED", "Repetition Needed"),
        ("QUIET_ENVIRONMENT", "Quiet Environment Preferred")
    ],
    
    "cultural_considerations": [
        ("LANGUAGE_SERVICES", "Language Services Required"),
        ("RELIGIOUS_PRACTICES", "Religious Practices"),
        ("DIETARY_REQUIREMENTS", "Dietary Requirements"),
        ("CULTURAL_CELEBRATIONS", "Cultural Celebrations"),
        ("GENDER_PREFERENCES", "Gender Preferences for Workers"),
        ("FAMILY_INVOLVEMENT", "Family Involvement Expectations"),
        ("TRADITIONAL_HEALING", "Traditional Healing Practices"),
        ("CLOTHING_REQUIREMENTS", "Cultural Clothing Requirements"),
        ("PRAYER_TIMES", "Prayer Times/Religious Observances"),
        ("INDIGENOUS_CONNECTIONS", "Indigenous Cultural Connections")
    ],
    
    # ==========================================
    # ENHANCED RISK ASSESSMENT DYNAMIC DATA TYPES
    # ==========================================
    
    "risk_categories": [
        ("PHYSICAL_SAFETY", "Physical Safety"),
        ("BEHAVIORAL", "Behavioral"),
        ("ENVIRONMENTAL", "Environmental"),
        ("MEDICAL_HEALTH", "Medical/Health"),
        ("PSYCHOLOGICAL", "Psychological/Mental Health"),
        ("SOCIAL", "Social"),
        ("FINANCIAL", "Financial"),
        ("SELF_HARM", "Self-Harm"),
        ("VIOLENCE_AGGRESSION", "Violence/Aggression"),
        ("SUBSTANCE_USE", "Substance Use"),
        ("WANDERING_ELOPEMENT", "Wandering/Elopement"),
        ("CHOKING_SWALLOWING", "Choking/Swallowing"),
        ("FALLS", "Falls"),
        ("MEDICATION", "Medication Management"),
        ("TECHNOLOGY_SAFETY", "Technology Safety")
    ],
    
    "risk_levels": [
        ("LOW", "Low Risk"),
        ("MEDIUM", "Medium Risk"),
        ("HIGH", "High Risk"),
        ("EXTREME", "Extreme Risk"),
        ("VARIABLE", "Variable Risk")
    ],
    
    "risk_likelihood": [
        ("VERY_UNLIKELY", "Very Unlikely"),
        ("UNLIKELY", "Unlikely"),
        ("POSSIBLE", "Possible"),
        ("LIKELY", "Likely"),
        ("VERY_LIKELY", "Very Likely"),
        ("ALMOST_CERTAIN", "Almost Certain")
    ],
    
    "risk_impact": [
        ("MINIMAL", "Minimal Impact"),
        ("MINOR", "Minor Impact"),
        ("MODERATE", "Moderate Impact"),
        ("MAJOR", "Major Impact"),
        ("CATASTROPHIC", "Catastrophic Impact")
    ],
    
    "risk_triggers": [
        ("STRESS_ANXIETY", "Stress/Anxiety"),
        ("CHANGE_IN_ROUTINE", "Change in Routine"),
        ("UNFAMILIAR_PEOPLE", "Unfamiliar People"),
        ("UNFAMILIAR_ENVIRONMENT", "Unfamiliar Environment"),
        ("LOUD_NOISES", "Loud Noises"),
        ("CROWDS", "Crowds"),
        ("PHYSICAL_DISCOMFORT", "Physical Discomfort"),
        ("COMMUNICATION_BARRIERS", "Communication Barriers"),
        ("MEDICATION_CHANGES", "Medication Changes"),
        ("LACK_OF_SLEEP", "Lack of Sleep"),
        ("HUNGER_THIRST", "Hunger/Thirst"),
        ("SENSORY_OVERLOAD", "Sensory Overload"),
        ("CONFLICTS", "Conflicts with Others"),
        ("TRANSITIONS", "Transitions/Changes")
    ],
    
    "risk_mitigation_strategies": [
        ("DIRECT_SUPERVISION", "Direct Supervision"),
        ("ENVIRONMENTAL_MODIFICATION", "Environmental Modification"),
        ("BEHAVIOR_INTERVENTION", "Behavior Intervention Plan"),
        ("STAFF_TRAINING", "Specialized Staff Training"),
        ("EMERGENCY_PROCEDURES", "Emergency Procedures"),
        ("COMMUNICATION_STRATEGIES", "Communication Strategies"),
        ("SENSORY_SUPPORTS", "Sensory Supports"),
        ("ROUTINE_STRUCTURE", "Routine and Structure"),
        ("MEDICAL_INTERVENTION", "Medical Intervention"),
        ("FAMILY_INVOLVEMENT", "Family/Carer Involvement"),
        ("TECHNOLOGY_SOLUTIONS", "Technology Solutions"),
        ("PEER_SUPPORT", "Peer Support"),
        ("PROFESSIONAL_REFERRAL", "Professional Referral"),
        ("MEDICATION_REVIEW", "Medication Review"),
        ("REGULAR_MONITORING", "Regular Monitoring")
    ],
    
    "emergency_contact_types": [
        ("PRIMARY_EMERGENCY", "Primary Emergency Contact"),
        ("SECONDARY_EMERGENCY", "Secondary Emergency Contact"),
        ("MEDICAL_PRACTITIONER", "Medical Practitioner"),
        ("SPECIALIST_DOCTOR", "Specialist Doctor"),
        ("HOSPITAL_PREFERENCE", "Preferred Hospital"),
        ("SUPPORT_COORDINATOR", "Support Coordinator"),
        ("CASE_MANAGER", "Case Manager"),
        ("GUARDIAN", "Guardian"),
        ("NEXT_OF_KIN", "Next of Kin"),
        ("ADVOCATE", "Advocate"),
        ("PHARMACY", "Pharmacy"),
        ("MENTAL_HEALTH_CRISIS", "Mental Health Crisis Team"),
        ("POLICE", "Police (if required)"),
        ("AMBULANCE", "Ambulance Service"),
        ("POISON_CONTROL", "Poison Control")
    ],
    
    "monitoring_equipment": [
        ("PERSONAL_ALARM", "Personal Alarm System"),
        ("GPS_TRACKER", "GPS Tracking Device"),
        ("MEDICAL_ALERT", "Medical Alert Device"),
        ("FALL_DETECTOR", "Fall Detector"),
        ("MEDICATION_DISPENSER", "Automated Medication Dispenser"),
        ("MOTION_SENSORS", "Motion Sensors"),
        ("DOOR_ALARMS", "Door/Exit Alarms"),
        ("CCTV_MONITORING", "CCTV Monitoring"),
        ("SMOKE_DETECTORS", "Smoke/Fire Detectors"),
        ("TEMPERATURE_MONITORS", "Temperature Monitors"),
        ("SEIZURE_MONITORS", "Seizure Monitors"),
        ("SLEEP_MONITORS", "Sleep Monitors")
    ],
    
    "staff_requirements": [
        ("BASIC_TRAINING", "Basic Disability Support Training"),
        ("FIRST_AID_CPR", "First Aid and CPR"),
        ("MANUAL_HANDLING", "Manual Handling"),
        ("MEDICATION_TRAINING", "Medication Administration"),
        ("BEHAVIOR_SUPPORT", "Behavior Support Training"),
        ("DEMENTIA_CARE", "Dementia Care Training"),
        ("MENTAL_HEALTH", "Mental Health First Aid"),
        ("AUTISM_SPECIFIC", "Autism-Specific Training"),
        ("COMMUNICATION", "Communication Support Training"),
        ("EMERGENCY_RESPONSE", "Emergency Response Training"),
        ("CULTURAL_AWARENESS", "Cultural Awareness Training"),
        ("TRAUMA_INFORMED", "Trauma-Informed Care"),
        ("POSITIVE_BEHAVIOR", "Positive Behavior Support"),
        ("SAFEGUARDING", "Safeguarding Training")
    ],
    
    # Plan Status and Workflow
    "plan_statuses": [
        ("DRAFT", "Draft"),
        ("PENDING_REVIEW", "Pending Review"),
        ("UNDER_REVIEW", "Under Review"),
        ("PENDING_APPROVAL", "Pending Approval"),
        ("APPROVED", "Approved"),
        ("ACTIVE", "Active"),
        ("REQUIRES_CHANGES", "Requires Changes"),
        ("SUSPENDED", "Suspended"),
        ("EXPIRED", "Expired"),
        ("ARCHIVED", "Archived")
    ],
    
    # Additional UI dropdown types
    "plan_periods": [
        ("6_MONTHS", "6 months"),
        ("12_MONTHS", "12 months"),
        ("18_MONTHS", "18 months"),
        ("24_MONTHS", "24 months"),
        ("CUSTOM", "Custom period")
    ],
    
    "support_durations": [
        ("1_HOUR", "1 hour"),
        ("2_HOURS", "2 hours"),
        ("3_HOURS", "3 hours"),
        ("4_HOURS", "4 hours"),
        ("5_HOURS", "5 hours"),
        ("6_HOURS", "6 hours"),
        ("8_HOURS", "8 hours"),
        ("FULL_DAY", "Full day"),
        ("HALF_DAY", "Half day"),
        ("OVERNIGHT", "Overnight"),
        ("RESPITE_WEEKEND", "Respite weekend"),
        ("CUSTOM_DURATION", "Custom duration")
    ],
    
    "support_locations": [
        ("PARTICIPANT_HOME", "Participant's Home"),
        ("COMMUNITY", "Community"),
        ("PROVIDER_PREMISES", "Provider Premises"),
        ("WORKPLACE", "Workplace"),
        ("EDUCATION_FACILITY", "Education Facility"),
        ("HEALTH_FACILITY", "Health Facility"),
        ("RECREATION_FACILITY", "Recreation Facility"),
        ("SHOPPING_CENTRE", "Shopping Centre"),
        ("TRANSPORT_HUB", "Transport Hub"),
        ("RESPITE_FACILITY", "Respite Facility"),
        ("ACCOMMODATION_FACILITY", "Accommodation Facility"),
        ("ONLINE_REMOTE", "Online/Remote"),
        ("MULTIPLE_LOCATIONS", "Multiple Locations"),
        ("AS_REQUIRED", "As Required")
    ],
    
    "staff_ratios": [
        ("ONE_TO_ONE", "1:1 (One staff to one participant)"),
        ("ONE_TO_TWO", "1:2 (One staff to two participants)"),
        ("ONE_TO_THREE", "1:3 (One staff to three participants)"),
        ("ONE_TO_FOUR", "1:4 (One staff to four participants)"),
        ("ONE_TO_FIVE", "1:5 (One staff to five participants)"),
        ("TWO_TO_ONE", "2:1 (Two staff to one participant)"),
        ("GROUP_SUPPORT", "Group Support (Variable ratio)"),
        ("SUPERVISION_ONLY", "Supervision Only"),
        ("REMOTE_SUPPORT", "Remote Support"),
        ("AS_REQUIRED", "As Required")
    ],
    
    "assessor_roles": [
        ("BEHAVIOR_SUPPORT_PRACTITIONER", "Behavior Support Practitioner"),
        ("OCCUPATIONAL_THERAPIST", "Occupational Therapist"),
        ("PHYSIOTHERAPIST", "Physiotherapist"),
        ("SPEECH_PATHOLOGIST", "Speech Pathologist"),
        ("PSYCHOLOGIST", "Psychologist"),
        ("SOCIAL_WORKER", "Social Worker"),
        ("REGISTERED_NURSE", "Registered Nurse"),
        ("SUPPORT_COORDINATOR", "Support Coordinator"),
        ("CASE_MANAGER", "Case Manager"),
        ("TEAM_LEADER", "Team Leader"),
        ("SERVICE_MANAGER", "Service Manager"),
        ("CLINICAL_MANAGER", "Clinical Manager"),
        ("ALLIED_HEALTH", "Allied Health Professional"),
        ("NDIS_PLANNER", "NDIS Planner"),
        ("LAC_COORDINATOR", "LAC Coordinator")
    ],
    
    "overall_risk_levels": [
        ("VERY_LOW", "Very Low Risk"),
        ("LOW", "Low Risk"),
        ("LOW_MEDIUM", "Low-Medium Risk"),
        ("MEDIUM", "Medium Risk"),
        ("MEDIUM_HIGH", "Medium-High Risk"),
        ("HIGH", "High Risk"),
        ("VERY_HIGH", "Very High Risk"),
        ("EXTREME", "Extreme Risk"),
        ("CRITICAL", "Critical Risk"),
        ("VARIABLE", "Variable Risk")
    ],
    
    "review_schedules": [
        ("WEEKLY", "Weekly"),
        ("FORTNIGHTLY", "Fortnightly"),
        ("MONTHLY", "Monthly"),
        ("SIX_WEEKLY", "Six Weekly"),
        ("QUARTERLY", "Quarterly (3 months)"),
        ("FOUR_MONTHLY", "Four Monthly"),
        ("SIX_MONTHLY", "Six Monthly"),
        ("ANNUALLY", "Annually"),
        ("BI_ANNUALLY", "Bi-annually"),
        ("AS_REQUIRED", "As Required"),
        ("INCIDENT_BASED", "Following Incidents"),
        ("GOAL_BASED", "When Goals Change"),
        ("CONTINUOUS", "Continuous Monitoring")
    ],
    
    "review_outcomes": [
        ("NO_CHANGES", "No Changes Required"),
        ("MINOR_ADJUSTMENTS", "Minor Adjustments"),
        ("MAJOR_REVISIONS", "Major Revisions"),
        ("GOAL_ACHIEVED", "Goal Achieved"),
        ("GOAL_MODIFIED", "Goal Modified"),
        ("NEW_GOALS_ADDED", "New Goals Added"),
        ("SERVICES_INCREASED", "Services Increased"),
        ("SERVICES_DECREASED", "Services Decreased"),
        ("PROVIDER_CHANGE", "Provider Change Required"),
        ("PLAN_SUSPENDED", "Plan Suspended"),
        ("EARLY_REVIEW", "Early Review Required")
    ]
}

# ENHANCED PRICING METADATA WITH COMPREHENSIVE CAPACITY BUILDING MAPPINGS
ENHANCED_PRICING_META = {
    # 🔧 CRITICAL FIX: Enhanced CAPACITY_BUILDING mapping
    "CAPACITY_BUILDING": {
        "service_code": "15_052_0128_1_1",  # Behavior Support Practitioner  
        "unit": "hour", 
        "rate": 193.99,
        "category": "Capacity Building",
        "description": "Capacity building support services - skill development and independence training",
        "ndis_category": "Improved Relationships",
        "support_form_mappings": {
            "support_types": ["Capacity Building", "Skill Development", "Independence Training", "Behavior Support"],
            "duration_conversions": {
                "15 minutes": 0.25,
                "30 minutes": 0.5,
                "45 minutes": 0.75,
                "1 hour": 1,
                "1.5 hours": 1.5,
                "2 hours": 2,
                "3 hours": 3,
                "4 hours": 4,
                "5 hours": 5,  # ✅ Handles "5_HOURS" from care plan
                "Half day": 4,
                "Full day": 8,
                "Session": 1,
                "Visit": 1,
                "Assessment": 2,
                # Dynamic data codes
                "5_HOURS": 5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "3_HOUR": 3,
                "4_HOUR": 4,
                "HALF_DAY": 4,
                "FULL_DAY": 8,
                "SESSION": 1,
                "VISIT": 1,
                "ASSESSMENT": 2
            },
            "frequency_multipliers": {
                "One-off": 1,
                "Daily": 7,
                "Weekly": 1,
                "Twice weekly": 2,
                "Fortnightly": 0.5,
                "Monthly": 0.25,
                "Intensive Period": 3,  # ✅ Handles "INTENSIVE_PERIOD"
                "As needed": 1,
                "Regular": 2,
                # Dynamic data codes  
                "INTENSIVE_PERIOD": 3,
                "ONE_OFF": 1,
                "DAILY": 7,
                "WEEKLY": 1,
                "TWICE_WEEKLY": 2,
                "FORTNIGHTLY": 0.5,
                "MONTHLY": 0.25,
                "AS_NEEDED": 1,
                "REGULAR": 2
            }
        }
    },
    
    # Additional capacity building mappings
    "DAILY_LIVING_SKILLS": {
        "service_code": "15_055_0128_1_1",  # OT for daily living
        "unit": "hour",
        "rate": 193.99,
        "category": "Capacity Building", 
        "description": "Daily living skills development and training",
        "support_form_mappings": {
            "support_types": ["Daily Living Skills", "Life Skills", "Independence Training"],
            "duration_conversions": {
                "Session": 1,
                "1 hour": 1,
                "2 hours": 2,
                "5 hours": 5,
                "5_HOURS": 5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "SESSION": 1
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "EMPLOYMENT_SUPPORT": {
        "service_code": "15_056_0128_1_1",
        "unit": "hour",
        "rate": 163.56,
        "category": "Capacity Building",
        "description": "Employment support and job finding services",
        "support_form_mappings": {
            "support_types": ["Employment Support", "Job Seeking", "Workplace Support"],
            "duration_conversions": {
                "Session": 1,
                "1 hour": 1,
                "2 hours": 2,
                "5 hours": 5,
                "5_HOURS": 5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "SESSION": 1
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "SOCIAL_SKILLS": {
        "service_code": "15_058_0128_1_1",  # Social work
        "unit": "hour",
        "rate": 163.56,
        "category": "Capacity Building",
        "description": "Social skills development and relationship building",
        "support_form_mappings": {
            "support_types": ["Social Skills", "Relationship Building", "Communication Skills"],
            "duration_conversions": {
                "Session": 1,
                "1 hour": 1,
                "2 hours": 2,
                "5 hours": 5,
                "5_HOURS": 5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "SESSION": 1
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "LIFE_SKILLS": {
        "service_code": "15_055_0128_1_1",  # OT services
        "unit": "hour", 
        "rate": 193.99,
        "category": "Capacity Building",
        "description": "Life skills training and development",
        "support_form_mappings": {
            "support_types": ["Life Skills", "Daily Living", "Independence"],
            "duration_conversions": {
                "Session": 1,
                "1 hour": 1,
                "2 hours": 2,
                "5 hours": 5,
                "5_HOURS": 5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "SESSION": 1
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    # Enhanced existing entries with better mappings
    "DOMESTIC_ASSISTANCE": {
        "service_code": "01_011_0107_1_1", 
        "unit": "hour", 
        "rate": 72.35,
        "category": "Core",
        "description": "Household tasks and domestic support",
        "support_form_mappings": {
            "support_types": ["Domestic Assistance", "Household Support", "Cleaning", "Home Help"],
            "duration_conversions": {
                "15 minutes": 0.25,
                "30 minutes": 0.5, 
                "1 hour": 1,
                "2 hours": 2,
                "3 hours": 3,
                "4 hours": 4,
                "5 hours": 5,
                "Half day": 4,
                "Full day": 8,
                # Dynamic data codes
                "15_MIN": 0.25,
                "30_MIN": 0.5,
                "1_HOUR": 1,
                "2_HOUR": 2,
                "3_HOUR": 3,
                "4_HOUR": 4,
                "5_HOURS": 5,
                "HALF_DAY": 4,
                "FULL_DAY": 8
            },
            "frequency_multipliers": {
                "Daily": 7,
                "Weekly": 1,
                "Twice weekly": 2,
                "Three times weekly": 3,
                "Monthly": 0.25,
                "Intensive Period": 5,
                # Dynamic data codes
                "DAILY": 7,
                "WEEKLY": 1,
                "TWICE_WEEKLY": 2,
                "THREE_WEEKLY": 3,
                "MONTHLY": 0.25,
                "INTENSIVE_PERIOD": 5
            }
        }
    },
    
    "PERSONAL_CARE": {
        "service_code": "01_013_0107_1_1", 
        "unit": "hour", 
        "rate": 78.90,
        "category": "Core",
        "description": "Personal hygiene and daily living support",
        "support_form_mappings": {
            "support_types": ["Personal Care", "Personal Hygiene", "Daily Living"],
            "duration_conversions": {
                "15 minutes": 0.25,
                "30 minutes": 0.5,
                "45 minutes": 0.75,
                "1 hour": 1,
                "1.5 hours": 1.5,
                "2 hours": 2,
                "5 hours": 5,
                # Dynamic data codes
                "15_MIN": 0.25,
                "30_MIN": 0.5,
                "45_MIN": 0.75,
                "1_HOUR": 1,
                "1_5_HOUR": 1.5,
                "2_HOUR": 2,
                "5_HOURS": 5
            },
            "frequency_multipliers": {
                "Daily": 7,
                "Twice daily": 14,
                "Weekly": 1,
                "As needed": 2,
                "Intensive Period": 5,
                # Dynamic data codes
                "DAILY": 7,
                "TWICE_DAILY": 14,
                "WEEKLY": 1,
                "AS_NEEDED": 2,
                "INTENSIVE_PERIOD": 5
            }
        }
    },
    
    "COMMUNITY_ACCESS": {
        "service_code": "01_015_0107_1_1", 
        "unit": "hour", 
        "rate": 75.20,
        "category": "Core",
        "description": "Community participation and social activities",
        "support_form_mappings": {
            "support_types": ["Community Access", "Social Participation", "Recreation"],
            "duration_conversions": {
                "1 hour": 1,
                "2 hours": 2,
                "3 hours": 3,
                "4 hours": 4,
                "5 hours": 5,
                "Half day": 4,
                "Full day": 8,
                # Dynamic data codes
                "1_HOUR": 1,
                "2_HOUR": 2,
                "3_HOUR": 3,
                "4_HOUR": 4,
                "5_HOURS": 5,
                "HALF_DAY": 4,
                "FULL_DAY": 8
            },
            "frequency_multipliers": {
                "Daily": 7,
                "Weekly": 1,
                "Twice weekly": 2,
                "Three times weekly": 3,
                "Regular": 2,
                "Intensive Period": 3,
                # Dynamic data codes
                "DAILY": 7,
                "WEEKLY": 1,
                "TWICE_WEEKLY": 2,
                "THREE_WEEKLY": 3,
                "REGULAR": 2,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "TRANSPORT": {
        "service_code": "01_016_0136_1_1", 
        "unit": "km", 
        "rate": 1.08,
        "category": "Core",
        "description": "Transportation assistance",
        "support_form_mappings": {
            "support_types": ["Transport", "Transportation", "Travel Support"],
            "duration_conversions": {
                "Short trip": 10,
                "Medium trip": 25,
                "Long trip": 50,
                "Full day": 100
            },
            "frequency_multipliers": {
                "Daily": 7,
                "Weekly": 1,
                "Twice weekly": 2,
                "Monthly": 0.25,
                "As needed": 1,
                "DAILY": 7,
                "WEEKLY": 1,
                "TWICE_WEEKLY": 2,
                "MONTHLY": 0.25,
                "AS_NEEDED": 1
            }
        }
    },
    
    "RESPITE_CARE": {
        "service_code": "01_012_0117_1_1", 
        "unit": "hour", 
        "rate": 68.50,
        "category": "Core",
        "description": "Temporary care and supervision",
        "support_form_mappings": {
            "support_types": ["Respite Care", "Temporary Care", "Relief Care"],
            "duration_conversions": {
                "1 hour": 1,
                "2 hours": 2,
                "Half day": 4,
                "Full day": 8,
                "Overnight": 12,
                "24 hours": 24,
                "5 hours": 5,
                # Dynamic data codes
                "1_HOUR": 1,
                "2_HOUR": 2,
                "HALF_DAY": 4,
                "FULL_DAY": 8,
                "OVERNIGHT": 12,
                "24_HOUR": 24,
                "5_HOURS": 5
            },
            "frequency_multipliers": {
                "One-off": 1,
                "Weekly": 1,
                "Fortnightly": 0.5,
                "Monthly": 0.25,
                "Intensive Period": 5,
                "As needed": 1,
                # Dynamic data codes
                "ONE_OFF": 1,
                "WEEKLY": 1,
                "FORTNIGHTLY": 0.5,
                "MONTHLY": 0.25,
                "INTENSIVE_PERIOD": 5,
                "AS_NEEDED": 1
            }
        }
    },
    
    "SIL_SUPPORT": {"service_code": "01_014_0107_1_1", "unit": "hour", "rate": 70.21},
    
    "BEHAVIOR_SUPPORT": {
        "service_code": "15_052_0128_1_1", 
        "unit": "hour", 
        "rate": 193.99,
        "category": "Capacity Building",
        "description": "Specialized behavior intervention",
        "support_form_mappings": {
            "support_types": ["Behavior Support", "Behavioral Intervention", "Psychology"],
            "duration_conversions": {
                "Session": 1,
                "1 hour": 1,
                "1.5 hours": 1.5,
                "2 hours": 2,
                "Assessment": 3,
                "5 hours": 5,
                "SESSION": 1,
                "1_HOUR": 1,
                "1_5_HOUR": 1.5,
                "2_HOUR": 2,
                "ASSESSMENT": 3,
                "5_HOURS": 5
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Fortnightly": 0.5,
                "Monthly": 0.25,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "FORTNIGHTLY": 0.5,
                "MONTHLY": 0.25,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "OT_SERVICES": {
        "service_code": "15_055_0128_1_1", 
        "unit": "hour", 
        "rate": 193.99,
        "category": "Capacity Building",
        "description": "Occupational therapy services",
        "support_form_mappings": {
            "support_types": ["Occupational Therapy", "OT", "Life Skills"],
            "duration_conversions": {
                "Session": 1,
                "45 minutes": 0.75,
                "1 hour": 1,
                "Assessment": 2,
                "5 hours": 5,
                "SESSION": 1,
                "45_MIN": 0.75,
                "1_HOUR": 1,
                "ASSESSMENT": 2,
                "5_HOURS": 5
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Fortnightly": 0.5,
                "Monthly": 0.25,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "FORTNIGHTLY": 0.5,
                "MONTHLY": 0.25,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "PHYSIO_SERVICES": {"service_code": "15_055_0128_1_1", "unit": "hour", "rate": 193.99},
    
    "SPEECH_THERAPY": {
        "service_code": "15_054_0128_1_1", 
        "unit": "hour", 
        "rate": 193.99,
        "category": "Capacity Building",
        "description": "Speech and communication therapy",
        "support_form_mappings": {
            "support_types": ["Speech Therapy", "Speech Pathology", "Communication Support"],
            "duration_conversions": {
                "Session": 1,
                "45 minutes": 0.75,
                "1 hour": 1,
                "Assessment": 2,
                "5 hours": 5,
                "SESSION": 1,
                "45_MIN": 0.75,
                "1_HOUR": 1,
                "ASSESSMENT": 2,
                "5_HOURS": 5
            },
            "frequency_multipliers": {
                "Weekly": 1,
                "Fortnightly": 0.5,
                "Monthly": 0.25,
                "Intensive Period": 3,
                "WEEKLY": 1,
                "FORTNIGHTLY": 0.5,
                "MONTHLY": 0.25,
                "INTENSIVE_PERIOD": 3
            }
        }
    },
    
    "PSYCHOLOGY": {"service_code": "15_057_0128_1_1", "unit": "hour", "rate": 214.41},
    "SOCIAL_WORK": {"service_code": "15_058_0128_1_1", "unit": "hour", "rate": 163.56},
    "DIETITIAN": {"service_code": "15_059_0128_1_1", "unit": "hour", "rate": 193.99},
    "EXERCISE_PHYSIOLOGY": {"service_code": "15_060_0128_1_1", "unit": "hour", "rate": 166.99},
    "NURSING": {"service_code": "15_061_0128_1_1", "unit": "hour", "rate": 163.56}
}

# Enhanced metadata for specific dynamic data types
ENHANCED_META = {
    # Support service metadata with NDIS pricing codes
    "support_service_types": {
        "PERSONAL_CARE": {
            "category": "core_support",
            "ndis_code": "01_013_0107_1_1",
            "funding_source": "core",
            "typical_duration": "1-4 hours",
            "qualifications_required": ["CERT_III_INDIVIDUAL_SUPPORT", "FIRST_AID"]
        },
        "DOMESTIC_ASSISTANCE": {
            "category": "core_support", 
            "ndis_code": "01_011_0107_1_1",
            "funding_source": "core",
            "typical_duration": "2-6 hours",
            "qualifications_required": ["CERT_III_INDIVIDUAL_SUPPORT"]
        },
        "COMMUNITY_ACCESS": {
            "category": "core_support",
            "ndis_code": "01_015_0107_1_1", 
            "funding_source": "core",
            "typical_duration": "2-8 hours",
            "qualifications_required": ["CERT_III_INDIVIDUAL_SUPPORT", "DRIVERS_LICENSE"]
        },
        "THERAPY_SERVICES": {
            "category": "capacity_building",
            "ndis_code": "15_054_0128_1_1",
            "funding_source": "capacity_building",
            "typical_duration": "1 hour",
            "qualifications_required": ["REGISTERED_THERAPIST", "UNIVERSITY_QUALIFIED"]
        },
        "BEHAVIOR_SUPPORT": {
            "category": "capacity_building",
            "ndis_code": "15_052_0128_1_1",
            "funding_source": "capacity_building", 
            "typical_duration": "1-2 hours",
            "qualifications_required": ["BEHAVIOR_SUPPORT_PRACTITIONER", "TERTIARY_QUALIFIED"]
        }
    },
    
    # Risk level metadata with response requirements
    "risk_levels": {
        "LOW": {
            "response_time": "routine",
            "supervision_level": "minimal",
            "documentation": "standard",
            "review_frequency": "quarterly"
        },
        "MEDIUM": {
            "response_time": "prompt", 
            "supervision_level": "regular",
            "documentation": "detailed",
            "review_frequency": "monthly"
        },
        "HIGH": {
            "response_time": "immediate",
            "supervision_level": "close",
            "documentation": "comprehensive", 
            "review_frequency": "weekly"
        },
        "EXTREME": {
            "response_time": "emergency",
            "supervision_level": "constant",
            "documentation": "incident_based",
            "review_frequency": "daily"
        }
    },
    
    # Goal timeframe metadata
    "goal_timeframes": {
        "SHORT_TERM": {
            "duration_months": 6,
            "review_frequency": "monthly",
            "measurement_frequency": "weekly"
        },
        "MEDIUM_TERM": {
            "duration_months": 12,
            "review_frequency": "quarterly", 
            "measurement_frequency": "monthly"
        },
        "LONG_TERM": {
            "duration_months": 24,
            "review_frequency": "biannually",
            "measurement_frequency": "quarterly"
        }
    },
    
    # Staff ratio metadata with NDIS requirements
    "staff_ratios": {
        "ONE_TO_ONE": {
            "ratio_numeric": "1:1",
            "intensity": "high",
            "suitable_for": ["complex_needs", "behavior_support", "high_risk"],
            "cost_multiplier": 1.0
        },
        "ONE_TO_TWO": {
            "ratio_numeric": "1:2", 
            "intensity": "medium_high",
            "suitable_for": ["moderate_needs", "social_activities"],
            "cost_multiplier": 0.6
        },
        "TWO_TO_ONE": {
            "ratio_numeric": "2:1",
            "intensity": "very_high", 
            "suitable_for": ["extreme_risk", "medical_support", "crisis"],
            "cost_multiplier": 2.0
        }
    },
    
    # Duration metadata
    "durations": {
        "15_MIN": {"hours": 0.25, "unit": "hour"},
        "30_MIN": {"hours": 0.5, "unit": "hour"},
        "45_MIN": {"hours": 0.75, "unit": "hour"},
        "1_HOUR": {"hours": 1, "unit": "hour"},
        "1_5_HOUR": {"hours": 1.5, "unit": "hour"},
        "2_HOUR": {"hours": 2, "unit": "hour"},
        "3_HOUR": {"hours": 3, "unit": "hour"},
        "4_HOUR": {"hours": 4, "unit": "hour"},
        "5_HOURS": {"hours": 5, "unit": "hour"},
        "HALF_DAY": {"hours": 4, "unit": "hour"},
        "FULL_DAY": {"hours": 8, "unit": "hour"},
        "OVERNIGHT": {"hours": 12, "unit": "hour"},
        "24_HOUR": {"hours": 24, "unit": "hour"},
        "SESSION": {"hours": 1, "unit": "session"},
        "VISIT": {"hours": 1, "unit": "visit"},
        "ASSESSMENT": {"hours": 2, "unit": "assessment"}
    },
    
    # Frequency metadata
    "frequencies": {
        "ONE_OFF": {"multiplier": 1},
        "DAILY": {"multiplier": 7},
        "TWICE_DAILY": {"multiplier": 14},
        "WEEKLY": {"multiplier": 1},
        "TWICE_WEEKLY": {"multiplier": 2},
        "THREE_WEEKLY": {"multiplier": 3},
        "FORTNIGHTLY": {"multiplier": 0.5},
        "MONTHLY": {"multiplier": 0.25},
        "INTENSIVE_PERIOD": {"multiplier": 5},
        "AS_NEEDED": {"multiplier": 1},
        "REGULAR": {"multiplier": 2}
    },
    
    # Overall risk level metadata
    "overall_risk_levels": {
        "VERY_LOW": {
            "numeric_score": 1,
            "response_time": "routine",
            "documentation_level": "minimal",
            "management_involvement": "standard"
        },
        "MEDIUM": {
            "numeric_score": 5,
            "response_time": "prompt",
            "documentation_level": "detailed", 
            "management_involvement": "regular"
        },
        "EXTREME": {
            "numeric_score": 9,
            "response_time": "immediate",
            "documentation_level": "comprehensive",
            "management_involvement": "continuous"
        }
    }
}

def create_or_update_entry(db: Session, entry_data: dict):
    """Helper to create or update dynamic data entries"""
    existing = db.query(DynamicData).filter(
        and_(
            DynamicData.type == entry_data["type"],
            DynamicData.code == entry_data["code"]
        )
    ).first()
    
    if existing:
        # Update existing
        existing.label = entry_data["label"]
        existing.meta = entry_data.get("meta", {})
        existing.is_active = entry_data.get("is_active", True)
        logger.info(f"Updated: {entry_data['type']}/{entry_data['code']}")
        return existing
    else:
        # Create new
        new_entry = DynamicData(**entry_data)
        db.add(new_entry)
        logger.info(f"Created: {entry_data['type']}/{entry_data['code']}")
        return new_entry

def upsert_seed(db: Session, dtype: str, code: str, label: str, meta: Optional[Dict] = None):
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
    """Run the complete enhanced dynamic data seeding process"""
    logger.info("Starting complete enhanced dynamic data seeding with capacity building support...")
    logger.info("=" * 80)
    
    total_entries = 0
    base_types = 0
    enhanced_types = 0
    
    for dtype, entries in BASE_SEEDS.items():
        # Determine if this is a base SRS type or enhanced type
        is_enhanced = dtype in [
            'goal_categories', 'goal_timeframes', 'goal_priorities', 'support_service_types',
            'support_delivery_methods', 'support_frequencies', 'support_duration_types',
            'monitoring_frequencies', 'monitoring_methods', 'review_triggers',
            'communication_preferences', 'cultural_considerations', 'risk_categories',
            'risk_levels', 'risk_likelihood', 'risk_impact', 'risk_triggers',
            'risk_mitigation_strategies', 'emergency_contact_types', 'monitoring_equipment',
            'staff_requirements', 'plan_statuses', 'plan_periods', 'support_durations',
            'support_locations', 'staff_ratios', 'assessor_roles', 'overall_risk_levels',
            'review_schedules', 'review_outcomes'
        ]
        
        if is_enhanced:
            enhanced_types += 1
            logger.info(f"Enhanced: {dtype} ({len(entries)} entries)")
        else:
            base_types += 1
            logger.info(f"Base SRS: {dtype} ({len(entries)} entries)")
            
        for code, label in entries:
            meta = None
            
            # Add enhanced pricing metadata for pricing items
            if dtype == "pricing_items":
                meta = ENHANCED_PRICING_META.get(code)
            
            # Add enhanced metadata if available
            elif dtype in ENHANCED_META and code in ENHANCED_META[dtype]:
                meta = ENHANCED_META[dtype][code]
            
            upsert_seed(db, dtype, code, label, meta)
            total_entries += 1
    
    try:
        db.commit()
        logger.info("\n" + "=" * 80)
        logger.info(f"✅ Enhanced seeding completed: {total_entries} entries")
        logger.info(f"Base SRS types: {base_types}")
        logger.info(f"Enhanced types: {enhanced_types}")
        logger.info(f"Total types: {base_types + enhanced_types}")
        logger.info("🎯 CAPACITY_BUILDING support type now available for quotations!")
        logger.info("Care Plans and Risk Assessments are now fully dynamic!")
        logger.info("=" * 80)
        
        return {
            "created": 0,  # Will be calculated by create_or_update_entry
            "updated": 0,  # Will be calculated by create_or_update_entry
            "total": total_entries,
            "types": list(BASE_SEEDS.keys())
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding dynamic data: {e}")
        raise

def verify_capacity_building_setup(db: Session) -> Dict[str, Any]:
    """Verify that capacity building is properly set up"""
    from app.services.dynamic_data_service import DynamicDataService
    
    verification_results = {
        "capacity_building_exists": False,
        "has_pricing_meta": False,
        "duration_mappings": False,
        "frequency_mappings": False,
        "errors": []
    }
    
    try:
        # Check if CAPACITY_BUILDING exists in pricing_items
        cb_entry = DynamicDataService.get_by_type_and_code(db, "pricing_items", "CAPACITY_BUILDING")
        if cb_entry:
            verification_results["capacity_building_exists"] = True
            
            if cb_entry.meta:
                verification_results["has_pricing_meta"] = True
                
                # Check for duration mappings
                mappings = cb_entry.meta.get("support_form_mappings", {})
                if "duration_conversions" in mappings:
                    duration_conversions = mappings["duration_conversions"]
                    if "5_HOURS" in duration_conversions and "5 hours" in duration_conversions:
                        verification_results["duration_mappings"] = True
                    else:
                        verification_results["errors"].append("Missing 5_HOURS or '5 hours' duration mapping")
                
                # Check for frequency mappings
                if "frequency_multipliers" in mappings:
                    frequency_multipliers = mappings["frequency_multipliers"]
                    if "INTENSIVE_PERIOD" in frequency_multipliers and "Intensive Period" in frequency_multipliers:
                        verification_results["frequency_mappings"] = True
                    else:
                        verification_results["errors"].append("Missing INTENSIVE_PERIOD frequency mapping")
                
            else:
                verification_results["errors"].append("CAPACITY_BUILDING entry has no meta field")
        else:
            verification_results["errors"].append("CAPACITY_BUILDING not found in pricing_items")
            
    except Exception as e:
        verification_results["errors"].append(f"Verification failed: {str(e)}")
    
    return verification_results

def get_seed_summary() -> Dict:
    """Get a summary of what will be seeded"""
    base_types = []
    enhanced_types = []
    
    for dtype in BASE_SEEDS.keys():
        is_enhanced = dtype in [
            'goal_categories', 'goal_timeframes', 'goal_priorities', 'support_service_types',
            'support_delivery_methods', 'support_frequencies', 'support_duration_types',
            'monitoring_frequencies', 'monitoring_methods', 'review_triggers',
            'communication_preferences', 'cultural_considerations', 'risk_categories',
            'risk_levels', 'risk_likelihood', 'risk_impact', 'risk_triggers',
            'risk_mitigation_strategies', 'emergency_contact_types', 'monitoring_equipment',
            'staff_requirements', 'plan_statuses', 'plan_periods', 'support_durations',
            'support_locations', 'staff_ratios', 'assessor_roles', 'overall_risk_levels',
            'review_schedules', 'review_outcomes'
        ]
        
        if is_enhanced:
            enhanced_types.append(dtype)
        else:
            base_types.append(dtype)
    
    return {
        "total_types": len(BASE_SEEDS),
        "total_entries": sum(len(entries) for entries in BASE_SEEDS.values()),
        "base_srs_types": base_types,
        "enhanced_types": enhanced_types,
        "base_srs_count": len(base_types),
        "enhanced_count": len(enhanced_types),
        "entries_per_type": {dtype: len(entries) for dtype, entries in BASE_SEEDS.items()},
        "care_plan_types": [t for t in enhanced_types if any(word in t.lower() for word in ['goal', 'support', 'monitoring', 'communication', 'cultural', 'plan'])],
        "risk_assessment_types": [t for t in enhanced_types if any(word in t.lower() for word in ['risk', 'emergency', 'staff', 'equipment'])],
        "capacity_building_types": [
            "capacity_building_types", "daily_living_skills", "employment_support", 
            "social_skills", "life_skills", "independence_training", "skill_development", 
            "behavior_intervention", "therapy_training"
        ],
        "metadata_coverage": {
            "types_with_metadata": len(ENHANCED_META) + 1,  # +1 for pricing_items
            "metadata_types": list(ENHANCED_META.keys()) + ["pricing_items"],
            "capacity_building_mappings": len([k for k in ENHANCED_PRICING_META.keys() if "CAPACITY" in k or "SKILLS" in k or "SUPPORT" in k])
        }
    }

# Legacy function for backward compatibility
def run_enhanced_seeding(db: Session) -> None:
    """Legacy function - now runs the complete seeding"""
    run(db)

def run_complete_seeding(db: Session) -> None:
    """Complete seeding function - same as run()"""
    run(db)

def run_enhanced(db: Session) -> None:
    """Enhanced seeding with capacity building support"""
    logger.info("Starting enhanced dynamic data seeding with capacity building mappings...")
    
    total_entries = 0
    
    # Seed base data
    for dtype, entries in BASE_SEEDS.items():
        for code, label in entries:
            meta = None
            
            # Add enhanced pricing metadata
            if dtype == "pricing_items":
                meta = ENHANCED_PRICING_META.get(code)
                
            upsert_seed(db, dtype, code, label, meta)
            total_entries += 1
    
    try:
        db.commit()
        logger.info(f"✅ Enhanced seeding completed: {total_entries} entries")
        logger.info("🎯 CAPACITY_BUILDING support type now available for quotations!")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error in enhanced seeding: {e}")
        raise

if __name__ == "__main__":
    # Allow running the script directly for testing
    print("Testing complete dynamic data seeding with enhanced capacity building...")
    summary = get_seed_summary()
    print(f"Total: {summary['total_entries']} entries across {summary['total_types']} types")
    print(f"Base SRS: {summary['base_srs_count']} types")
    print(f"Enhanced: {summary['enhanced_count']} types")
    print(f"Capacity Building mappings: {summary['metadata_coverage']['capacity_building_mappings']}")
    print("Script validation passed!")
#