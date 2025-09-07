#!/usr/bin/env python3
# backend/seed_dynamic_data.py

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.dynamic_data import DataType, DataPoint
from datetime import datetime

def seed_dynamic_data():
    """Seed the database with default dynamic data points for NDIS system"""
    
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        
        # Default data types and their data points
        default_data = {
            "disabilities": {
                "display_name": "Disabilities",
                "description": "Types of disabilities supported by NDIS",
                "points": [
                    "Intellectual Disability",
                    "Autism Spectrum Disorder",
                    "Physical Disability",
                    "Sensory Disability",
                    "Psychosocial Disability",
                    "Neurological Disability",
                    "Multiple Disabilities",
                    "Other"
                ]
            },
            "genders": {
                "display_name": "Genders",
                "description": "Gender options for participants and staff",
                "points": [
                    "Male",
                    "Female",
                    "Non-binary",
                    "Prefer not to say",
                    "Other"
                ]
            },
            "qualifications": {
                "display_name": "Qualifications",
                "description": "Staff qualifications and certifications",
                "points": [
                    "Certificate III in Individual Support",
                    "Certificate IV in Disability",
                    "Certificate IV in Mental Health",
                    "Diploma of Community Services",
                    "Bachelor of Social Work",
                    "Registered Nurse",
                    "First Aid Certificate",
                    "CPR Certificate",
                    "Manual Handling Certificate"
                ]
            },
            "likes": {
                "display_name": "Participant Likes",
                "description": "Common activities and interests participants enjoy",
                "points": [
                    "Music",
                    "Art and Crafts",
                    "Sports",
                    "Reading",
                    "Movies/TV",
                    "Cooking",
                    "Gardening",
                    "Animals/Pets",
                    "Shopping",
                    "Social Activities",
                    "Technology/Gaming",
                    "Exercise/Fitness"
                ]
            },
            "dislikes": {
                "display_name": "Participant Dislikes",
                "description": "Things participants prefer to avoid",
                "points": [
                    "Loud Noises",
                    "Crowds",
                    "Bright Lights",
                    "Sudden Changes",
                    "Spicy Food",
                    "Cold Weather",
                    "Physical Contact",
                    "Waiting"
                ]
            },
            "vaccinations": {
                "display_name": "Vaccinations",
                "description": "Common vaccinations tracked for participants",
                "points": [
                    "COVID-19",
                    "Influenza (Flu)",
                    "Hepatitis B",
                    "Tetanus",
                    "Pneumococcal",
                    "MMR (Measles, Mumps, Rubella)",
                    "Other"
                ]
            },
            "relationship_types": {
                "display_name": "Relationship Types",
                "description": "Types of relationships between participants",
                "points": [
                    "Family Member",
                    "Friend",
                    "Roommate",
                    "Partner",
                    "Acquaintance",
                    "Support Person",
                    "Other"
                ]
            },
            "service_types": {
                "display_name": "Service Types",
                "description": "Types of NDIS services provided",
                "points": [
                    "Personal Care",
                    "Community Access",
                    "Social Support",
                    "Domestic Assistance",
                    "Transport",
                    "Meal Preparation",
                    "Shopping Assistance",
                    "Respite Care",
                    "Therapy Support",
                    "Skill Development"
                ]
            },
            "states": {
                "display_name": "Australian States",
                "description": "Australian states and territories",
                "points": [
                    "New South Wales",
                    "Victoria", 
                    "Queensland",
                    "Western Australia",
                    "South Australia",
                    "Tasmania",
                    "Australian Capital Territory",
                    "Northern Territory"
                ]
            }
        }
        
        created_count = 0
        
        for data_type_name, data_type_info in default_data.items():
            # Check if data type already exists
            existing_type = db.query(DataType).filter(DataType.name == data_type_name).first()
            
            if not existing_type:
                # Create data type
                data_type = DataType(
                    name=data_type_name,
                    display_name=data_type_info["display_name"],
                    description=data_type_info["description"],
                    is_active=True,
                    created_at=now,
                    updated_at=now
                )
                db.add(data_type)
                db.flush()  # Get the ID without committing
                print(f"[CREATED] Data type: {data_type_info['display_name']}")
                
                # Create data points
                for i, point_name in enumerate(data_type_info["points"]):
                    data_point = DataPoint(
                        data_type_id=data_type.id,
                        name=point_name,
                        sort_order=i,
                        is_active=True,
                        created_at=now,
                        updated_at=now
                    )
                    db.add(data_point)
                    created_count += 1
                
                print(f"  -> Added {len(data_type_info['points'])} data points")
            else:
                print(f"[SKIPPED] Data type already exists: {data_type_info['display_name']}")
        
        db.commit()
        print(f"\n[SUCCESS] Seeded {created_count} data points across data types!")
        
        # Display summary
        total_types = db.query(DataType).count()
        total_points = db.query(DataPoint).count()
        print(f"[SUMMARY] Total data types: {total_types}, Total data points: {total_points}")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed data: {e}")
        return False
    finally:
        db.close()
    
    return True

if __name__ == "__main__":
    seed_dynamic_data()