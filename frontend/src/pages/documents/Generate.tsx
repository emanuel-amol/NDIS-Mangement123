import React, { useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import ServiceAgreement, { ServiceAgreementProps } from "./templates/ServiceAgreement";
import ParticipantHandbook, { ParticipantHandbookProps } from "./templates/ParticipantHandbook";

const API_BASE = "http://localhost:8000";

type TemplateKey = "service_agreement" | "participant_handbook";

export default function Generate() {
  const [templateKey, setTemplateKey] = useState<TemplateKey>("service_agreement");

  // ----- Service Agreement form state -----
  const [saParticipant, setSaParticipant] = useState({
    full_name: "",
    ndis_number: "",
    address: "",
  });
  const [saSupports, setSaSupports] = useState(
    ""
  );
  const [saRisk, setSaRisk] = useState(
    ""
  );
  const [saCadence, setSaCadence] = useState("Monthly");
  const [saPricing, setSaPricing] = useState<Array<{ name: string; rate: number; hours: number }>>([
    { name: "Assistance with Daily Life", rate: 62.17, hours: 6 },
    { name: "Community Participation", rate: 46.82, hours: 4 },
  ]);

  // ----- Participant Handbook form state -----
  const [phParticipant, setPhParticipant] = useState({ full_name: "" });
  const [phLikes, setPhLikes] = useState("");
  const [phDislikes, setPhDislikes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Build props for the selected template
  const mergedProps = useMemo(() => {
    if (templateKey === "service_agreement") {
      const props: ServiceAgreementProps = {
        participant: {
          full_name: saParticipant.full_name,
          ndis_number: saParticipant.ndis_number,
          address: saParticipant.address,
        },
        pricing: saPricing,
        care_requirements: [saSupports],
        risk_assessment: { summary: saRisk },
        generated_at: new Date().toISOString(),
      };
      return props;
    } else {
      const props: ParticipantHandbookProps = {
        participant: {
          full_name: phParticipant.full_name,
          ndis_number: saParticipant.ndis_number,
          address: saParticipant.address,
        },
        likes: phLikes.split(",").map((s) => s.trim()).filter(Boolean),
        dislikes: phDislikes.split(",").map((s) => s.trim()).filter(Boolean),
        pricing: saPricing,
        care_requirements: [saSupports],
        risk_assessment: { summary: saRisk },
        generated_at: new Date().toISOString(),
      };
      return props;
    }
  }, [
    templateKey,
    saParticipant.full_name,
    saParticipant.ndis_number,
    saParticipant.address,
    saPricing,
    saSupports,
    saRisk,
    phParticipant.full_name,
    phLikes,
    phDislikes,
  ]);

 

  // Table editor helpers for pricing rows (service agreement)
  function updatePricingRow(index: number, field: "name" | "rate" | "hours", value: string) {
    setSaPricing((rows) => {
      const copy = rows.slice();
      if (field === "name") copy[index].name = value;
      if (field === "rate") copy[index].rate = Number(value) || 0;
      if (field === "hours") copy[index].hours = Number(value) || 0;
      return copy;
    });
  }
  function addPricingRow() {
    setSaPricing((rows) => [...rows, { name: "", rate: 0, hours: 0 }]);
  }
  function removePricingRow(index: number) {
    setSaPricing((rows) => rows.filter((_, i) => i !== index));
  }

  async function handlePreviewHtml() {
    const element =
      templateKey === "service_agreement" ? (
        <ServiceAgreement {...(mergedProps as ServiceAgreementProps)} />
      ) : (
        <ParticipantHandbook {...(mergedProps as ParticipantHandbookProps)} />
      );
    const html = "<!doctype html>" + renderToStaticMarkup(element);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function handleGeneratePdf() {
    setBusy(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const element =
        templateKey === "service_agreement" ? (
          <ServiceAgreement {...(mergedProps as ServiceAgreementProps)} />
        ) : (
          <ParticipantHandbook {...(mergedProps as ParticipantHandbookProps)} />
        );
      const html = "<!doctype html>" + renderToStaticMarkup(element);

      const res = await fetch(`${API_BASE}/api/v1/docgen/render-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          filename_prefix: templateKey,
        }),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail || "Failed to generate");
      }
      const data = await res.json();
      const url: string =
        typeof data?.url === "string"
          ? data.url.startsWith("http")
            ? data.url
            : `${API_BASE}${data.url}`
          : "";
      if (!url) throw new Error("Server did not return a file URL");
      setDownloadUrl(url);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Dynamic Document Generation (TSX → PDF)</h1>
      <p className="text-gray-600">Fill the form, review merged fields, then generate.</p>

      {/* Template selector */}
      <div className="bg-white rounded-xl shadow p-4">
        <label className="block text-sm text-gray-600 mb-1">Template</label>
        <select
          className="w-full md:w-80 border rounded-lg p-2"
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
        >
          <option value="service_agreement">Service Agreement — Standard</option>
          <option value="participant_handbook">Participant Handbook</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">
          Templates are managed in the Form Builder.{" "}
          <a className="underline" href="#" onClick={(e) => e.preventDefault()}>
            Open Template Gallery
          </a>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT COLUMN: participant & agreement inputs */}
        <div className="space-y-4">
          {templateKey === "service_agreement" ? (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold">Participant</h2>
              <label className="block text-sm text-gray-600">Name</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.full_name}
                onChange={(e) =>
                  setSaParticipant({ ...saParticipant, full_name: e.target.value })
                }
              />

              <label className="block text-sm text-gray-600">NDIS Number</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.ndis_number}
                onChange={(e) =>
                  setSaParticipant({ ...saParticipant, ndis_number: e.target.value })
                }
              />

              <label className="block text-sm text-gray-600">Address</label>
              <input
                className="w-full border rounded-lg p-2"
                value={saParticipant.address}
                onChange={(e) =>
                  setSaParticipant({ ...saParticipant, address: e.target.value })
                }
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-semibold">Participant</h2>
              <label className="block text-sm text-gray-600">Name</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phParticipant.full_name}
                onChange={(e) =>
                  setPhParticipant({ full_name: e.target.value })
                }
              />

              <label className="block text-sm text-gray-600">Likes (comma separated)</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phLikes}
                onChange={(e) => setPhLikes(e.target.value)}
              />

              <label className="block text-sm text-gray-600">Dislikes (comma separated)</label>
              <input
                className="w-full border rounded-lg p-2"
                value={phDislikes}
                onChange={(e) => setPhDislikes(e.target.value)}
              />
            </div>
          )}

          {templateKey === "service_agreement" && (
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

              <label className="block text-sm text-gray-600">Review cadence</label>
              <select
                className="w-full border rounded-lg p-2"
                value={saCadence}
                onChange={(e) => setSaCadence(e.target.value)}
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Biannually</option>
              </select>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: pricing + merge preview */}
        <div className="space-y-4">
          {templateKey === "service_agreement" && (
            <div className="bg-white rounded-xl shadow p-4">
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
                          <button
                            className="text-sm text-red-600"
                            onClick={() => removePricingRow(i)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addPricingRow}
                className="mt-2 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
              >
                Add row
              </button>
            </div>
          )}

          
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          disabled={busy}
          onClick={handleGeneratePdf}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Generating..." : "Generate & Download PDF"}
        </button>

        <button
          onClick={handlePreviewHtml}
          className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          Generate & Preview (HTML)
        </button>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {downloadUrl && (
        <p className="text-green-700">
          Done.{" "}
          <a className="underline" href={downloadUrl} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        </p>
      )}
    </div>
  );
}
