// frontend/src/services/ai.ts
const API = import.meta.env.VITE_API_URL + '/api/v1';

export async function aiCarePlanSuggest(participantId: number, participantContext: any, carePlanDraft?: any) {
  const r = await fetch(`${API}/participants/${participantId}/ai/care-plan/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantContext, carePlanDraft: carePlanDraft || null }),
  });
  if (!r.ok) throw new Error('AI care-plan suggest failed');
  return r.json(); // { ok, suggestion_id, data }
}

export async function aiRiskAssess(participantId: number, notes: string[]) {
  const r = await fetch(`${API}/participants/${participantId}/ai/risk/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!r.ok) throw new Error('AI risk assess failed');
  return r.json(); // { ok, suggestion_id, data }
}

export async function aiClinicalNote(participantId: number, interactionSummary: string) {
  const r = await fetch(`${API}/participants/${participantId}/ai/notes/clinical`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interactionSummary }),
  });
  if (!r.ok) throw new Error('AI clinical note failed');
  return r.json(); // { ok, suggestion_id, data }
}