// frontend/src/services/signing.ts
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000") as string;

export type EnvelopeCreate = {
    participant_id: number;
    document_ids: number[];
    signer_name: string;
    signer_email: string;
    signer_role: "participant" | "guardian";
    ttl_days?: number;
};

export type EnvelopeRead = {
    id: number;
    participant_id: number;
    document_ids_json: number[];
    signer_name: string;
    signer_email: string;
    signer_role: string;
    status: string;
    expires_at?: string;
    completed_at?: string;
};

export async function createEnvelope(payload: EnvelopeCreate): Promise<EnvelopeRead> {
    const r = await fetch(`${API_BASE}/api/v1/signing/envelopes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function listEnvelopes(participantId: number): Promise<EnvelopeRead[]> {
    const r = await fetch(`${API_BASE}/api/v1/signing/envelopes?participant_id=${participantId}`, { 
        credentials: "include" 
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function cancelEnvelope(envelopeId: number): Promise<{ ok: boolean; status: string }> {
    const r = await fetch(`${API_BASE}/api/v1/signing/envelopes/${envelopeId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function resendEnvelope(envelopeId: number): Promise<{ ok: boolean; status: string }> {
    const r = await fetch(`${API_BASE}/api/v1/signing/envelopes/${envelopeId}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

// Public endpoints
export type EnvelopePublicRead = {
    signer_name: string;
    signer_role: string;
    documents: { id: number; title: string; filename?: string; category?: string }[];
    status: string;
    expires_at?: string;
};

export async function getPublicEnvelope(token: string): Promise<EnvelopePublicRead> {
    const r = await fetch(`${API_BASE}/api/public/sign/${token}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}

export async function acceptSignature(
    token: string, 
    typed_name: string
): Promise<{ ok: boolean; status: string }> {
    const r = await fetch(`${API_BASE}/api/public/sign/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            typed_name: typed_name,
            accept_terms: true,
        }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
}