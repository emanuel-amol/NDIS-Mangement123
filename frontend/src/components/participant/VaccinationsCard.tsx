// frontend/src/components/participant/VaccinationsCard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Syringe, Pencil, Trash2, Save, X } from 'lucide-react';
import { VaccinationsService, VaccinationRecord, VaccinationCreateInput } from '../../services/vaccinations';
import { dynamicDataAPI, type DynamicDataEntry } from '../../services/api';

interface Props {
  participantId: number;
}

type Mode = 'view' | 'create' | 'edit';

export default function VaccinationsCard({ participantId }: Props) {
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('view');
  const [vaccines, setVaccines] = useState<DynamicDataEntry[]>([]);
  const [form, setForm] = useState<VaccinationCreateInput>({
    vaccine_name: '',
    date_administered: new Date().toISOString().slice(0, 10),
    brand: '',
    dose_number: '',
    lot_number: '',
    provider: '',
    notes: '',
  });
  const [editId, setEditId] = useState<number | null>(null);

  const vaccineOptions = useMemo(
    () => vaccines.filter(v => v.is_active).map(v => ({ value: v.label, label: v.label })),
    [vaccines]
  );

  const load = async () => {
    try {
      setLoading(true);
      const [list, vaccs] = await Promise.all([
        VaccinationsService.list(participantId),
        dynamicDataAPI.getByType('vaccinations'),
      ]);
      setRecords(list);
      setVaccines(vaccs);
    } catch (e) {
      console.error(e);
      setError('Failed to load vaccinations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [participantId]);

  const resetForm = () => {
    setForm({
      vaccine_name: '',
      date_administered: new Date().toISOString().slice(0, 10),
      brand: '',
      dose_number: '',
      lot_number: '',
      provider: '',
      notes: '',
    });
    setEditId(null);
  };

  const startCreate = () => {
    resetForm();
    setMode('create');
  };

  const startEdit = (record: VaccinationRecord) => {
    setEditId(record.id);
    setForm({
      vaccine_name: record.vaccine_name,
      date_administered: record.date_administered.slice(0, 10),
      brand: record.brand || '',
      dose_number: record.dose_number || '',
      lot_number: record.lot_number || '',
      provider: record.provider || '',
      notes: record.notes || '',
    });
    setMode('edit');
  };

  const cancel = () => {
    resetForm();
    setMode('view');
  };

  const save = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!form.vaccine_name || !form.date_administered) {
        setError('Vaccine and date are required');
        setLoading(false);
        return;
      }
      if (mode === 'create') {
        await VaccinationsService.create(participantId, form);
      } else if (mode === 'edit' && editId) {
        await VaccinationsService.update(participantId, editId, form);
      }
      await load();
      cancel();
    } catch (e: any) {
      setError(e?.message || 'Failed to save vaccination');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this vaccination record?')) return;
    try {
      setLoading(true);
      await VaccinationsService.remove(participantId, id);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Syringe size={20} className="text-blue-600" /> Vaccinations
        </h3>
        {mode === 'view' ? (
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            <Plus size={16} /> Add Vaccination
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Save size={16} /> Save
            </button>
            <button
              onClick={cancel}
              className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-2 rounded hover:bg-gray-200"
            >
              <X size={16} /> Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Vaccine</label>
            <select
              value={form.vaccine_name}
              onChange={(e) => setForm({ ...form, vaccine_name: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select vaccine</option>
              {vaccineOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Date administered</label>
            <input
              type="date"
              value={form.date_administered}
              onChange={(e) => setForm({ ...form, date_administered: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Brand (optional)</label>
            <input
              type="text"
              value={form.brand || ''}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="e.g., Pfizer"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Dose (optional)</label>
            <input
              type="text"
              value={form.dose_number || ''}
              onChange={(e) => setForm({ ...form, dose_number: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="1, 2, booster"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Provider (optional)</label>
            <input
              type="text"
              value={form.provider || ''}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Clinic / GP / Pharmacy"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Lot number (optional)</label>
            <input
              type="text"
              value={form.lot_number || ''}
              onChange={(e) => setForm({ ...form, lot_number: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dose</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  {loading ? 'Loading vaccinations...' : 'No vaccination records yet'}
                </td>
              </tr>
            )}
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">
                  {new Date(r.date_administered).toLocaleDateString('en-AU')}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900">{r.vaccine_name}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{r.brand || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{r.dose_number || '-'}</td>
                <td className="px-4 py-2 text-sm text-gray-600">{r.provider || '-'}</td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(r)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 px-2 py-1"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 px-2 py-1"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
