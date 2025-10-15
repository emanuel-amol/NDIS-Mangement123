// frontend/src/services/vaccinations.ts
export interface VaccinationRecord {
  id: number;
  participant_id: number;
  vaccine_name: string;
  brand?: string | null;
  dose_number?: string | null;
  date_administered: string; // ISO date
  lot_number?: string | null;
  provider?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaccinationCreateInput {
  vaccine_name: string;
  date_administered: string; // ISO date
  brand?: string | null;
  dose_number?: string | null;
  lot_number?: string | null;
  provider?: string | null;
  notes?: string | null;
}

export interface VaccinationUpdateInput extends Partial<VaccinationCreateInput> {}

const resolveApiBaseUrl = (): string => {
  const raw =
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_API_URL ??
    'http://localhost:8000';

  const trimmed = raw.replace(/\/+$/, '');
  if (trimmed.endsWith('/api/v1')) {
    return trimmed;
  }
  return `${trimmed}/api/v1`;
};

export class VaccinationsService {
  static readonly API_BASE_URL = resolveApiBaseUrl();

  static async list(participantId: number): Promise<VaccinationRecord[]> {
    const res = await fetch(
      `${this.API_BASE_URL}/participants/${participantId}/vaccinations/`
    );
    if (!res.ok) throw new Error('Failed to load vaccinations');
    return res.json();
  }

  static async create(
    participantId: number,
    payload: VaccinationCreateInput
  ): Promise<VaccinationRecord> {
    const res = await fetch(
      `${this.API_BASE_URL}/participants/${participantId}/vaccinations/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create vaccination');
    }
    return res.json();
  }

  static async update(
    participantId: number,
    vaccinationId: number,
    payload: VaccinationUpdateInput
  ): Promise<VaccinationRecord> {
    const res = await fetch(
      `${this.API_BASE_URL}/participants/${participantId}/vaccinations/${vaccinationId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update vaccination');
    }
    return res.json();
  }

  static async remove(
    participantId: number,
    vaccinationId: number
  ): Promise<void> {
    const res = await fetch(
      `${this.API_BASE_URL}/participants/${participantId}/vaccinations/${vaccinationId}`,
      { method: 'DELETE' }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete vaccination');
    }
  }
}

