import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export default function CareSignoff() {
  const { participantId } = useParams<{ participantId: string }>();
  const [cp, setCP] = useState<any>(null);
  const [ra, setRA] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: care }, { data: risk }] = await Promise.all([
      supabase.from("care_plans").select("*").eq("participant_id", participantId).maybeSingle(),
      supabase.from("risk_assessments").select("*").eq("participant_id", participantId).maybeSingle(),
    ]);
    setCP(care); setRA(risk); setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [participantId]);

  const finalise = async () => {
    if (cp?.id) await supabase.from("care_plans").update({ status: "complete" }).eq("id", cp.id);
    if (ra?.id) await supabase.from("risk_assessments").update({ status: "complete" }).eq("id", ra.id);
    await load();
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Care Sign-off</h1>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <Panel title="Care Plan" status={cp?.status} data={cp} />
        <Panel title="Risk Assessment" status={ra?.status} data={ra} />
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Pre-sign-off checklist</h3>
        <ul>
          <li>Participant & representative details verified</li>
          <li>Care Plan supports and pricing reviewed</li>
          <li>Risk controls acceptable and review date set</li>
          <li>Consent captured to proceed to Service Agreement</li>
        </ul>
        <button onClick={finalise} style={{ background: "#2563eb", color: "#fff", border: 0, borderRadius: 8, padding: "8px 12px" }}>
          Finalise (mark complete)
        </button>
      </div>
    </div>
  );
}

function Panel({ title, status, data }: { title: string; status?: string; data: any }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span style={{
          padding: "2px 8px", borderRadius: 999,
          background: status === "complete" ? "#dcfce7" : "#fef9c3",
          color: status === "complete" ? "#166534" : "#854d0e", fontSize: 12, fontWeight: 700
        }}>
          {status ?? "draft"}
        </span>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 12 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
