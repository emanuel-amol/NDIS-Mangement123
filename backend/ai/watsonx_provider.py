# backend/ai/watsonx_provider.py
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from dotenv import load_dotenv, find_dotenv
from ibm_watsonx_ai.client import Credentials
from ibm_watsonx_ai.foundation_models import ModelInference

# Load root .env regardless of run dir
load_dotenv(find_dotenv(filename=".env", usecwd=True), override=True)

@dataclass
class WXConfig:
    url: str = os.getenv("WATSONX_URL", "")
    api_key: str = os.getenv("WATSONX_API_KEY", "")
    project_id: str = os.getenv("WATSONX_PROJECT_ID", "")
    model_id: str = os.getenv("WATSONX_MODEL_ID", "ibm/granite-3-8b-instruct")
    decoding_method: str = os.getenv("WATSONX_DECODING_METHOD", "greedy")
    max_new_tokens: int = int(os.getenv("WATSONX_MAX_NEW_TOKENS", "512"))
    temperature: float = float(os.getenv("WATSONX_TEMPERATURE", "0.2"))

class WatsonxLLM:
    """watsonx.ai adapter for Participant AI use cases."""

    def __init__(self, cfg: Optional[WXConfig] = None):
        self.cfg = cfg or WXConfig()
        if not self.cfg.url or not self.cfg.api_key or not self.cfg.project_id:
            raise ValueError("Missing watsonx env: WATSONX_URL / WATSONX_API_KEY / WATSONX_PROJECT_ID")

        creds = Credentials(url=self.cfg.url, api_key=self.cfg.api_key)
        self.model = ModelInference(
            model_id=self.cfg.model_id,
            credentials=creds,
            project_id=self.cfg.project_id,
            params={
                "decoding_method": self.cfg.decoding_method,
                "max_new_tokens": self.cfg.max_new_tokens,
                "temperature": self.cfg.temperature,
            },
        )

    def _gen(self, prompt: str) -> str:
        out = self.model.generate(prompt=prompt)
        if isinstance(out, dict):
            return out.get("results", [{}])[0].get("generated_text") or str(out)
        return str(out)

    def care_plan_markdown(self, participant: Dict[str, Any]) -> str:
        prompt = f"""You are an NDIS support planner.
Return a concise markdown **Care Plan** with:
- 3 goals
- 3 recommended supports (include category hints if obvious)
- 2 measurable outcomes (SMART style)
- Notes (<=80 words, human-readable)
Keep neutral language. No medical advice.

Participant (YAML-like):
{participant}
"""
        return self._gen(prompt)

    def risk_summary(self, notes: List[str]) -> str:
        joined = "\n- ".join(notes) if notes else "None provided."
        prompt = f"""You are a risk assessor. From these case notes, output:
- Risk level: Low / Medium / High (justify in one sentence)
- Top 3 risks (bullets)
- Mitigations (bullets, <=5, practical + respectful)
Avoid clinical diagnoses. Be concise.

Case notes:
- {joined}
"""
        return self._gen(prompt)

    def soap_note(self, interaction_summary: str) -> str:
        prompt = f"""Write a succinct **SOAP** progress note (<=120 words) for this interaction:
{interaction_summary}
Use plain language and avoid sensitive PII; this is a draft for human review.
"""
        return self._gen(prompt)