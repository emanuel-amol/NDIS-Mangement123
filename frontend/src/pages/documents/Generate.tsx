// frontend/src/pages/documents/Generate.tsx
import React, { useMemo, useState, useEffect } from "react";

import ServiceAgreement, { ServiceAgreementProps } from "./templates/ServiceAgreement";
import ParticipantHandbook, { ParticipantHandbookProps } from "./templates/ParticipantHandbook";

const API_BASE = "http://localhost:8000";

type TemplateKey = "service_agreement" | "participant_handbook";

// Optional prefill from parent
type GenerateProps = {
  participantPrefill?: {
    id?: number;
    full_name?: string;
    ndis_number?: string;
    address?: string;
  };
  defaultTemplate?: TemplateKey; // optional override template at load
};

export default function Generate({
  participantPrefill,
  defaultTemplate = "service_agreement",
}: GenerateProps) {
  const [templateKey, setTemplateKey] = useState<TemplateKey>(defaultTemplate);

  // ---- Service Agreement fields
  const [saParticipant, setSaParticipant] = useState({
    full_name: "",
    ndis_number: "",
    address: "",
  });
  const [saSupports, setSaSupports] = useState("");
  const [saRisk, setSaRisk] = useState("");
  const [saPricing, setSaPricing] = useState<Array<{ name: string; rate: number; hours: number }>>([
    { name: "", rate: 0, hours: 0 },
  ]);

  // ---- Participant Handbook fields
  const [phParticipant, setPhParticipant] = useState({ full_name: "", ndis_number: "", address: "" });
  const [phLikes, setPhLikes] = useState("");
  const [phDislikes, setPhDislikes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Apply prefill on mount / when participant changes
  useEffect(() => {
    if (!participantPrefill) return;
    setSaParticipant((prev) => ({
      ...prev,
      full_name: participantPrefill.full_name ?? prev.full_name,
      ndis_number: participantPrefill.ndis_number ?? prev.ndis_number,
      address: participantPrefill.address ?? prev.address,
    }));
    setPhParticipant((prev) => ({
      ...prev,
      full_name: participantPrefill.full_name ?? prev.full_name,
      ndis_number: participantPrefill.ndis_number ?? prev.ndis_number,
      address: participantPrefill.address ?? prev.address,
    }));
  }, [
    participantPrefill?.id,
    participantPrefill?.full_name,
    participantPrefill?.ndis_number,
    participantPrefill?.address,
  ]);

  const mergedProps = useMemo(() => {
    if (templateKey === "service_agreement") {
      const props: ServiceAgreementProps = {
        participant: saParticipant,
        pricing: saPricing,
        care_requirements: saSupports ? [saSupports] : [],
        risk_assessment: { summary: saRisk },
        generated_at: new Date().toISOString(),
      };
      return props;
    }
    const props: ParticipantHandbookProps = {
      participant: phParticipant,
      likes: phLikes.split(",").map((s) => s.trim()).filter(Boolean),
      dislikes: phDislikes.split(",").map((s) => s.trim()).filter(Boolean),
      // extra fields kept for compatibility; your backend can ignore them
      pricing: [],
      care_requirements: [],
      risk_assessment: { summary: "" },
      generated_at: "",
    };
    return props;
  }, [
    templateKey,
    saParticipant,
    saPricing,
    saSupports,
    saRisk,
    phParticipant,
    phLikes,
    phDislikes,
  ]);

  function updatePricingRow(i: number, field: "name" | "rate" | "hours", value: string) {
    setSaPricing((rows) => {
      const copy = rows.slice();
      if (field === "name") copy[i].name = value;
      if (field === "rate") copy[i].rate = Number(value) || 0;
      if (field === "hours") copy[i].hours = Number(value) || 0;
      return copy;
    });
  }
  function addPricingRow() {
    setSaPricing((rows) => [...rows, { name: "", rate: 0, hours: 0 }]);
  }
  function removePricingRow(i: number) {
    setSaPricing((rows) => rows.filter((_, idx) => idx !== i));
  }

  // NEW: Save to DB as a draft
  async function handleSaveDraft() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const payload =
        templateKey === "service_agreement"
          ? (mergedProps as ServiceAgreementProps)
          : (mergedProps as ParticipantHandbookProps);

      const res = await fetch(`${API_BASE}/api/v1/template-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_key: templateKey,
          participant_id: participantPrefill?.id ?? null,
          status: "draft",
          data: payload,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail || "Failed to save");
      }
      const saved = await res.json(); // { id, ... }
      setSuccess(`Saved Changes #${saved.id}`);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <label className="block text-sm text-gray-600">Template</label>
        <select
          className="w-full md:w-80 border rounded-lg p-2"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
        >
          <option value="service_agreement">Service Agreement — Standard</option>
          <option value="participant_handbook">Participant Handbook</option>
        </select>
        <p className="text-xs text-gray-500">Templates are managed in the Form Builder.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT column: participant + care */}
        {templateKey === "service_agreement" ? (
          <>
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold">Participant</h2>
              <label className="block text-sm text-gray-600">Name</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.full_name}
                onChange={(e) => setSaParticipant({ ...saParticipant, full_name: e.target.value })}
              />
              <label className="block text-sm text-gray-600">NDIS Number</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.ndis_number}
                onChange={(e) => setSaParticipant({ ...saParticipant, ndis_number: e.target.value })}
              />
              <label className="block text-sm text-gray-600">Address</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.address}
                onChange={(e) => setSaParticipant({ ...saParticipant, address: e.target.value })}
              />
            </div>

            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold">Care needs mapping</h2>
              <label className="block text-sm text-gray-600">Supports</label>
              <textarea
                className="w-full border rounded-lg p-2"
                rows={3}
                value={saSupports}
                onChange={(e) => setSaSupports(e.target.value)}
              />
              <label className="block text-sm text-gray-600">Risk considerations</label>
              <textarea
                className="w-full border rounded-lg p-2"
                rows={3}
                value={saRisk}
                onChange={(e) => setSaRisk(e.target.value)}
              />
            </div>

            {/* full width on next row */}
            <div className="bg-white rounded-xl shadow p-4 md:col-span-2">
              <h2 className="font-semibold mb-2">Support items & rates</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-2 border-b">Service</th>
                      <th className="text-left p-2 border-b">Rate (AUD/hr)</th>
                      <th className="text-left p-2 border-b">Hours</th>
                      <th className="p-2 border-b"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {saPricing.map((row, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <input
                            className="w-full border rounded p-1"
                            value={row.name}
                            onChange={(e) => updatePricingRow(i, "name", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="w-full border rounded p-1"
                            type="number"
                            step="0.01"
                            value={row.rate}
                            onChange={(e) => updatePricingRow(i, "rate", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="w-full border rounded p-1"
                            type="number"
                            step="1"
                            value={row.hours}
                            onChange={(e) => updatePricingRow(i, "hours", e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <button className="text-sm text-red-600" onClick={() => removePricingRow(i)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addPricingRow} className="mt-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50">
                Add row
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <label className="block text-sm text-gray-600">Name</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phParticipant.full_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPhParticipant({ ...phParticipant, full_name: e.target.value })
                }
              />
              <label className="block text-sm text-gray-600">NDIS Number</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phParticipant.ndis_number}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPhParticipant({ ...phParticipant, ndis_number: e.target.value })
                }
              />
              <label className="block text-sm text-gray-600">Address</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phParticipant.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPhParticipant({ ...phParticipant, address: e.target.value })
                }
              />
            </div>
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold">Preferences</h2>
              <label className="block text-sm text-gray-600">Likes (comma separated)</label>
              <input className="w-full border rounded-lg p-2" value={phLikes} onChange={(e) => setPhLikes(e.target.value)} />
              <label className="block text-sm text-gray-600">Dislikes (comma separated)</label>
              <input className="w-full border rounded-lg p-2" value={phDislikes} onChange={(e) => setPhDislikes(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={handleSaveDraft}
          disabled={busy}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {success && <span className="text-green-700">{success}</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>
    </div>
  );
}
