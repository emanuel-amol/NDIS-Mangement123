import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

type Risk = { title: string; likelihood: "Low"|"Medium"|"High"; impact: "Low"|"Medium"|"High"; mitigation?: string };

type RiskAssessment = {
  id?: string;
  participant_id: string;
  context: { environment?: string; supports_involved?: string; summary?: string };
  risks: Risk[];
  escalation: { steps?: string; key_contacts?: string };
  review_date?: string;
  status?: "draft" | "complete";
};

export default function RiskAssessmentEditor() {
  const { participantId } = useParams<{ participantId: string }>();
  const nav = useNavigate();

  const [ra, setRa] = useState<RiskAssessment>({
    participant_id: participantId!,
    context: { environment: "", supports_involved: "", summary: "" },
    risks: [{ title: "", likelihood: "Low", impact: "Low", mitigation: "" }],
    escalation: { steps: "", key_contacts: "" },
    review_date: "",
    status: "draft",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("risk_assessments")
        .select("*")
        .eq("participant_id", participantId)
        .maybeSingle();
      if (!error && data) setRa(data as RiskAssessment);
      setLoading(false);
    })();
  }, [participantId]);

  const save = async () => {
    if (!ra.review_date || !ra.risks.length || !ra.risks[0].title) {
      alert("Please add at least one risk and a review date.");
      return;
    }
    setSaving(true);
    if (ra.id) {
      await supabase.from("risk_assessments").update(ra).eq("id", ra.id);
    } else {
      const { data } = await supabase
        .from("risk_assessments")
        .insert([{ ...ra, participant_id: participantId }])
        .select()
        .single();
      if (data) setRa(data as RiskAssessment);
    }
    setSaving(false);
    nav(`/care/signoff/${participantId}`);
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Risk Assessment (Draft)</h1>

      <Section title="Context">
        <input className="input" placeholder="Environment (home, community…)"
               value={ra.context.environment ?? ""} onChange={e => setRa({ ...ra, context: { ...ra.context, environment: e.target.value } })}/>
        <input className="input" placeholder="Supports involved"
               value={ra.context.supports_involved ?? ""} onChange={e => setRa({ ...ra, context: { ...ra.context, supports_involved: e.target.value } })}/>
        <textarea className="textarea" placeholder="Summary"
               value={ra.context.summary ?? ""} onChange={e => setRa({ ...ra, context: { ...ra.context, summary: e.target.value } })}/>
      </Section>

      <Section title="Risks & Mitigations">
        {ra.risks.map((r, i) => (
          <div key={`rk-${i}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 8 }}>
            <input className="input" placeholder="Risk (e.g., medication mismanagement)" value={r.title}
                   onChange={e => updateRisk(i, { ...r, title: e.target.value })}/>
            <select className="input" value={r.likelihood} onChange={e => updateRisk(i, { ...r, likelihood: e.target.value as any })}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
            <select className="input" value={r.impact} onChange={e => updateRisk(i, { ...r, impact: e.target.value as any })}>
              <option>Low</option><option>Medium</option><option>High</option>
            </select>
            <textarea className="textarea" placeholder="Mitigation strategy" value={r.mitigation ?? ""}
                      onChange={e => updateRisk(i, { ...r, mitigation: e.target.value })}/>
            <div>
              <button className="btn" onClick={() => addRisk()}>+ Add risk</button>
              {ra.risks.length > 1 && <button className="btn" onClick={() => removeRisk(i)}>Remove</button>}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Emergency & Escalation">
        <textarea className="textarea" placeholder="Escalation steps"
                  value={ra.escalation.steps ?? ""} onChange={e => setRa({ ...ra, escalation: { ...ra.escalation, steps: e.target.value } })}/>
        <input className="input" placeholder="Key contacts" value={ra.escalation.key_contacts ?? ""}
               onChange={e => setRa({ ...ra, escalation: { ...ra.escalation, key_contacts: e.target.value } })}/>
        <input className="input" placeholder="Review date (YYYY-MM-DD)" value={ra.review_date ?? ""}
               onChange={e => setRa({ ...ra, review_date: e.target.value })}/>
      </Section>

      <div className="row">
        <button className="btn" onClick={() => nav(-1)}>Back</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
      </div>

      <style>{`
        .input{border:1px solid #e5e7eb;padding:8px;border-radius:8px;width:100%;margin:6px 0}
        .textarea{border:1px solid #e5e7eb;padding:8px;border-radius:8px;width:100%;min-height:80px;margin:6px 0}
        .btn{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:6px 8px 0 0;cursor:pointer}
        .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      `}</style>
    </div>
  );

  function updateRisk(i: number, value: Risk){ const arr=[...ra.risks]; arr[i]=value; setRa({ ...ra, risks: arr }); }
  function addRisk(){ setRa({ ...ra, risks: [...ra.risks, { title:"", likelihood:"Low", impact:"Low", mitigation:"" }] }); }
  function removeRisk(i:number){ const arr=[...ra.risks]; arr.splice(i,1); setRa({ ...ra, risks: arr }); }
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, margin: "12px 0" }}>
      <legend style={{ fontWeight: 700 }}>{title}</legend>
      {children}
    </fieldset>
  );
}
