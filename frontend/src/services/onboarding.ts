// frontend/src/services/onboarding.ts
import { withAuth } from './auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export interface OnboardingPackItem {
  document_id: number | null;
  document_type: string;
  title: string;
  status: string; // MISSING | pending_signature | signed | ready
  required: boolean;
  category: string;
}

export interface OnboardingPackResponse {
  participant_id: number;
  participant_name: string;
  items: OnboardingPackItem[];
  all_required_complete: boolean;
  missing_count: number;
  pending_signature_count: number;
  signed_count: number;
}

export interface SendPackRequest {
  signer_name: string;
  signer_email: string;
  signer_role: 'participant' | 'guardian';
}

export interface SendPackResponse {
  ok: boolean;
  envelope_id: number;
  token: string;
  document_count: number;
  public_url: string;
}

export async function getOnboardingPack(participantId: number): Promise<OnboardingPackResponse> {
  const response = await fetch(
    `${API_BASE}/participants/${participantId}/onboarding/pack`,
    { headers: withAuth() }
  );
  
  if (!response.ok) {
    throw new Error('Failed to load onboarding pack');
  }
  
  return response.json();
}

export async function sendOnboardingPack(
  participantId: number,
  payload: SendPackRequest
): Promise<SendPackResponse> {
  const response = await fetch(
    `${API_BASE}/participants/${participantId}/onboarding/send-pack`,
    {
      method: 'POST',
      headers: withAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send onboarding pack');
  }
  
  return response.json();
}