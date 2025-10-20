# app/services/ai/participant_risk.py
from typing import List, Dict
import json

def generate_risk_draft(chunks: List[Dict], participant: Dict, dynamic_data: Dict) -> Dict:
    """
    Generate a risk assessment draft from document chunks and participant data.
    
    Args:
        chunks: List of text chunks from uploaded documents
        participant: Participant profile data
        dynamic_data: Dynamic configuration data
        
    Returns:
        Dict with risks, mitigations, and citations
    """
    try:
        from ai.watsonx_provider import WatsonxLLM
        
        wx = WatsonxLLM()
        
        chunk_texts = "\n\n".join([f"[Chunk {c.get('id', i)}]: {c['text'][:500]}..." 
                                    for i, c in enumerate(chunks[:10])])
        
        participant_context = f"""
Participant: {participant.get('name', 'Unknown')}
Age: {participant.get('age', 'N/A')}
Medical Info: {participant.get('medical_information', 'Not provided')}
Support Needs: {participant.get('support_needs', 'Not specified')}
"""
        
        prompt = f"""You are an NDIS risk assessment specialist. Based on the following information, identify potential risks and mitigation strategies.

PARTICIPANT INFORMATION:
{participant_context}

UPLOADED DOCUMENTS:
{chunk_texts}

Identify 3-5 key risks and provide:
- Risk factor description
- Likelihood (Low/Medium/High)
- Impact (Low/Medium/High)
- Mitigation strategies
- Monitoring requirements

Return ONLY valid JSON in this exact format:
{{
  "risks": [
    {{
      "factor": "Description of the risk",
      "likelihood": "Low/Medium/High",
      "impact": "Low/Medium/High",
      "mitigation": "How to mitigate this risk",
      "monitor": "How to monitor this risk",
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
            
            if "risks" not in result:
                result["risks"] = []
            
            for i, risk in enumerate(result["risks"]):
                if "citations" not in risk:
                    risk["citations"] = [c.get('id', i) for c in chunks[:2]]
            
            return result
            
        except json.JSONDecodeError:
            return {
                "risks": [{
                    "factor": "General safety and wellbeing",
                    "likelihood": "Medium",
                    "impact": "Medium",
                    "mitigation": "Establish baseline safety protocols",
                    "monitor": "Regular review and documentation",
                    "citations": []
                }]
            }
        
    except Exception as e:
        print(f"Error generating risk assessment: {e}")
        return {
            "risks": [{
                "factor": "Risk assessment incomplete",
                "likelihood": "Unknown",
                "impact": "Unknown",
                "mitigation": f"Manual risk assessment required. AI error: {str(e)}",
                "monitor": "Conduct comprehensive manual risk assessment",
                "citations": []
            }]
        }
