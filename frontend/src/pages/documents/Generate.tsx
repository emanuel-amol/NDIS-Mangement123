import React, { JSX, useEffect, useMemo, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Import your TSX templates here:
import ServiceAgreement from "./templates/ServiceAgreement";
import ParticipantHandbook from "./templates/ParticipantHandbook";

type TemplateKey = "service_agreement" | "participant_handbook";
const templateMap: Record<TemplateKey, (props: any) => JSX.Element> = {
  service_agreement: (props) => <ServiceAgreement {...props} />,
  participant_handbook: (props) => <ParticipantHandbook {...props} />,
};

export default function Generate() {
  const [selected, setSelected] = useState<TemplateKey>("service_agreement");
  const [propsJson, setPropsJson] = useState<string>(() =>
    JSON.stringify(
      {
        participant: {
          full_name: "John Citizen",
          ndis_number: "430-000-123",
          address: "1 Example St, Melbourne VIC 3000",
        },
        pricing: [
          { name: "Assistance with Daily Life", rate: 62.17, hours: 10 },
          { name: "Community Participation", rate: 46.82, hours: 6 },
        ],
        care_requirements: ["Medication prompt", "Meal preparation", "Transport to appointments"],
        risk_assessment: { summary: "Low falls risk. Monitor medication adherence." },
        likes: ["Music", "Gardening"],
        dislikes: ["Crowded places"],
      },
      null,
      2
    )
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const TemplateComponent = useMemo(() => templateMap[selected], [selected]);

  async function handleGenerate() {
    setError(null);
    setDownloadUrl(null);

    let props: any;
    try {
      props = JSON.parse(propsJson);
    } catch {
      setError("Invalid JSON");
      return;
    }

    // Render the selected TSX template to a static HTML string
    const html = "<!doctype html>" + renderToStaticMarkup(TemplateComponent(props));

    // POST HTML to FastAPI for PDF generation
    const res = await fetch("/api/v1/docgen/render-html", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        html,
        filename_prefix: selected
      }),
    });

    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      setError(detail?.detail || "Failed to generate");
      return;
    }

    const data = await res.json();
    // data.url is a server-relative path, e.g. /static/documents/file.pdf
    setDownloadUrl(data.url);
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Dynamic Document Generation (TSX → PDF)</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Template</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value as TemplateKey)}
          className="border p-2 rounded"
        >
          <option value="service_agreement">service_agreement</option>
          <option value="participant_handbook">participant_handbook</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Props (JSON)</label>
        <textarea
          value={propsJson}
          onChange={(e) => setPropsJson(e.target.value)}
          className="w-full h-64 border p-2 font-mono text-sm"
        />
      </div>

      <button onClick={handleGenerate} className="px-4 py-2 rounded bg-black text-white">
        Generate PDF
      </button>

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
