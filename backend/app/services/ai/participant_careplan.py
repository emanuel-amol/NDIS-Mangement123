# app/services/ai/participant_careplan.py
from typing import List, Dict
import json

def generate_careplan_draft(chunks: List[Dict], participant: Dict, dynamic_data: Dict) -> Dict:
    """
    Generate a care plan draft from document chunks and participant data.
    
    Args:
        chunks: List of text chunks from uploaded documents
        participant: Participant profile data
        dynamic_data: Dynamic configuration data (support types, etc.)
        
    Returns:
        Dict with goals, supports, and citations
    """
    try:
        from ai.watsonx_provider import WatsonxLLM
        
        wx = WatsonxLLM()
        
        # Prepare context
        chunk_texts = "\n\n".join([f"[Chunk {c.get('id', i)}]: {c['text'][:500]}..." 
                                    for i, c in enumerate(chunks[:10])])
        
        participant_context = f"""
Participant: {participant.get('name', 'Unknown')}
Age: {participant.get('age', 'N/A')}
NDIS Number: {participant.get('ndis_number', 'N/A')}
Support Needs: {participant.get('support_needs', 'Not specified')}
"""
        
        prompt = f"""You are an NDIS care plan specialist. Based on the following information, create a structured care plan.

PARTICIPANT INFORMATION:
{participant_context}

UPLOADED DOCUMENTS:
{chunk_texts}

AVAILABLE SUPPORT TYPES:
{', '.join(dynamic_data.get('support_types', ['Personal Care', 'Community Access', 'Daily Living Support']))}

Generate a care plan with:
1. 3-5 SMART goals (be specific and measurable)
2. 3-5 recommended supports (specify type, frequency, duration, staff ratio, location)
3. Include brief notes explaining why each support is recommended

Return ONLY valid JSON in this exact format:
{{
  "goals": ["Goal 1", "Goal 2", "Goal 3"],
  "supports": [
    {{
      "type": "Support Type",
      "frequency": "Weekly/Daily/etc",
      "duration": "1 hour/2 hours/etc",
      "staff_ratio": "1:1/1:2/etc",
      "location": "Home/Community/etc",
      "notes": "Rationale for this support",
      "citations": [0, 1]
    }}
  ]
}}
"""
        
        response = wx._gen(prompt)
        
        try:
            clean_response = response.strip()
            if clean_response.startswith('```'):
                clean_response = clean_response.split('```')[1]
                if clean_response.startswith('json'):
                    clean_response = clean_response[4:]
            clean_response = clean_response.strip()
            
            result = json.loads(clean_response)
            
            if "goals" not in result:
                result["goals"] = []
            if "supports" not in result:
                result["supports"] = []
            
            for i, support in enumerate(result["supports"]):
                if "citations" not in support:
                    support["citations"] = [c.get('id', i) for c in chunks[:2]]
            
            return result
            
        except json.JSONDecodeError:
            return {
                "goals": ["Review participant documentation", "Establish baseline support needs"],
                "supports": [{
                    "type": "Assessment Required",
                    "frequency": "Once",
                    "duration": "Initial",
                    "staff_ratio": "1:1",
                    "location": "To be determined",
                    "notes": "AI generation encountered an error. Manual care plan development required.",
                    "citations": []
                }]
            }
        
    except Exception as e:
        print(f"Error generating care plan draft: {e}")
        return {
            "goals": ["Review participant documentation"],
            "supports": [{
                "type": "Assessment Required",
                "frequency": "Once",
                "duration": "Initial",
                "staff_ratio": "1:1",
                "location": "To be determined",
                "notes": f"AI generation error: {str(e)}",
                "citations": []
            }]
        }
