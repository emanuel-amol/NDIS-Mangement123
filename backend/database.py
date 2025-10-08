#!/usr/bin/env python3
"""
Quick fix for participant_ai.py to handle missing attributes
Run from backend directory: python quick_fix_ai.py
"""

import os
from pathlib import Path

def apply_fix():
    file_path = Path("app/api/v1/endpoints/participant_ai.py")
    
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return
    
    # Read the current file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if already patched
    if 'safe_get_participant_attr' in content:
        print("✅ File already patched!")
        return
    
    # Add the safe getter function after imports
    safe_getter = '''
def safe_get_participant_attr(participant, attr: str, default: Any = None) -> Any:
    """Safely get participant attribute with fallback"""
    return getattr(participant, attr, default)

'''
    
    # Find where to insert (after router definition)
    insert_point = content.find('router = APIRouter(')
    if insert_point == -1:
        print("❌ Could not find router definition")
        return
    
    # Find the end of that line
    insert_point = content.find('\n', insert_point) + 1
    
    # Insert the function
    content = content[:insert_point] + safe_getter + content[insert_point:]
    
    # Fix suggest_care_plan function - replace the participant_data dict
    old_participant_data = '''participant_data = {
            "id": participant.id,
            "name": f"{participant.first_name} {participant.last_name}",
            "date_of_birth": participant.date_of_birth.isoformat() if participant.date_of_birth else None,
            "ndis_number": participant.ndis_number,
            "support_needs": participant.support_needs or "Not specified",
            "communication_preferences": participant.communication_preferences or {},
        }'''
    
    new_participant_data = '''participant_data = {
            "id": participant.id,
            "name": f"{participant.first_name} {participant.last_name}",
            "date_of_birth": participant.date_of_birth.isoformat() if participant.date_of_birth else None,
            "ndis_number": safe_get_participant_attr(participant, 'ndis_number'),
            "support_needs": safe_get_participant_attr(participant, 'support_needs', 'Not specified'),
            "communication_preferences": safe_get_participant_attr(participant, 'communication_preferences', {}),
        }'''
    
    content = content.replace(old_participant_data, new_participant_data)
    
    # Fix assess_risk function - fix the notes handling
    old_notes_code = '''if not notes:
            notes = [
                participant.support_needs or "No support needs documented",
                participant.medical_information or "No medical information available"
            ]'''
    
    new_notes_code = '''# Fix: Ensure notes is always a list
        if notes is None or not isinstance(notes, list):
            notes = [
                safe_get_participant_attr(participant, 'support_needs', 'No support needs documented'),
                safe_get_participant_attr(participant, 'medical_information', 'No medical information available')
            ]'''
    
    content = content.replace(old_notes_code, new_notes_code)
    
    # Add typing import for Any
    if 'from typing import' in content and 'Any' not in content.split('from typing import')[1].split('\n')[0]:
        content = content.replace(
            'from typing import Dict, Any, List',
            'from typing import Dict, Any, List, Optional'
        )
    
    # Write the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Successfully patched {file_path}")
    print("\n🔄 Restart the server:")
    print("  uvicorn app.main:app --reload")

if __name__ == "__main__":
    print("🔧 Applying quick fix to participant_ai.py...\n")
    apply_fix()