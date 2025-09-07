import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

type Support = { type: string; frequency: string; notes?: string };
type Goal = { text: string; note?: string };

type CarePlan = {
  id?: string;
  participant_id: string;
  plan_period?: string;
  start_date?: string; // yyyy-mm-dd
  summary?: string;
  short_goals: Goal[];
  long_goals: Goal[];
  supports: Support[];
  monitoring: { progress_measures?: string; review_cadence?: string };
  status?: "draft" | "complete";
};

export default function CarePlanEditor() {
  const { participantId } = useParams<{ participantId: string }>();
  const nav = useNavigate();
  const [cp, setCp] = useState<CarePlan>({
    participant_id: participantId!,
    plan_period: "",
    start_date: "",
    summary: "",
    short_goals: [{ text: "" }],
    long_goals: [],
    supports: [{ type: "", frequency: "Weekly", notes: "" }],
    monitoring: { progress_measures: "", review_cadence: "Monthly" },
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("care_plans")
        .select("*")
        .eq("participant_id", participantId)
        .maybeSingle();
      if (!error && data) setCp(data as CarePlan);
      setLoading(false);
    })();
  }, [participantId]);

  const save = async () => {
    if (!cp.summary) {
      alert("Summary is required");
      return;
    }
    setSaving(true);

    // Insert or update depending on presence of id
    if (cp.id) {
      await supabase.from("care_plans").update(cp).eq("id", cp.id);
    } else {
      const { data } = await supabase
        .from("care_plans")
        .insert([{ ...cp, participant_id: participantId }])
        .select()
        .single();
      if (data) setCp(data as CarePlan);
    }
    setSaving(false);
    nav(`/care/signoff/${participantId}`);
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Care Plan (Draft)</h1>

      <Section title="Overview">
        <input className="input" placeholder="Plan period" value={cp.plan_period ?? ""} onChange={e => setCp({ ...cp, plan_period: e.target.value })} />
        <input className="input" placeholder="Start date (YYYY-MM-DD)" value={cp.start_date ?? ""} onChange={e => setCp({ ...cp, start_date: e.target.value })} />
        <textarea className="textarea" placeholder="Plan summary" value={cp.summary ?? ""} onChange={e => setCp({ ...cp, summary: e.target.value })} />
      </Section>

      <Section title="Goals">
        <h4 className="sub">Short-term goals</h4>
        {cp.short_goals.map((g, i) => (
          <div key={`sg-${i}`} className="row">
            <input className="input" placeholder="Goal" value={g.text} onChange={e => updateArray("short_goals", i, { ...g, text: e.target.value })} />
            <button className="btn" onClick={() => addRow("short_goals")}>+ Add</button>
            {cp.short_goals.length > 1 && <button className="btn" onClick={() => removeRow("short_goals", i)}>Remove</button>}
          </div>
        ))}

        <h4 className="sub">Long-term goals</h4>
        {(cp.long_goals.length ? cp.long_goals : [{ text: "" }]).map((g, i) => (
          <div key={`lg-${i}`} className="row">
            <input className="input" placeholder="Goal" value={cp.long_goals[i]?.text ?? ""} onChange={e => updateArray("long_goals", i, { text: e.target.value })} />
            <button className="btn" onClick={() => addRow("long_goals")}>+ Add</button>
            {cp.long_goals.length > 0 && <button className="btn" onClick={() => removeRow("long_goals", i)}>Remove</button>}
          </div>
        ))}
      </Section>

      <Section title="Supports & Services">
        {cp.supports.map((s, i) => (
          <div key={`sp-${i}`} className="grid">
            <input className="input" placeholder="Support type (e.g., Assistance with daily living)" value={s.type} onChange={e => updateArray("supports", i, { ...s, type: e.target.value })} />
            <input className="input" placeholder="Frequency (e.g., Weekly)" value={s.frequency} onChange={e => updateArray("supports", i, { ...s, frequency: e.target.value })} />
            <input className="input" placeholder="Notes" value={s.notes ?? ""} onChange={e => updateArray("supports", i, { ...s, notes: e.target.value })} />
            <div>
              <button className="btn" onClick={() => addRow("supports")}>+ Add support</button>
              {cp.supports.length > 1 && <button className="btn" onClick={() => removeRow("supports", i)}>Remove</button>}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Monitoring">
        <textarea className="textarea" placeholder="Progress measures" value={cp.monitoring.progress_measures ?? ""} onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, progress_measures: e.target.value } })} />
        <input className="input" placeholder="Review cadence (e.g., Monthly)" value={cp.monitoring.review_cadence ?? ""} onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, review_cadence: e.target.value } })} />
      </Section>

      <div className="row">
        <button className="btn" onClick={() => nav(-1)}>Back</button>
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
      </div>
    </div>
  );

  function updateArray<K extends keyof CarePlan>(key: K, index: number, value: any) {
    const arr = [...(cp[key] as any[])]; arr[index] = value; setCp({ ...cp, [key]: arr });
  }
  function addRow<K extends keyof CarePlan>(key: K) {
    const arr = [...(cp[key] as any[])];
    arr.push(key === "supports" ? { type: "", frequency: "Weekly", notes: "" } : { text: "" });
    setCp({ ...cp, [key]: arr });
  }
  function removeRow<K extends keyof CarePlan>(key: K, index: number) {
    const arr = [...(cp[key] as any[])]; arr.splice(index, 1); setCp({ ...cp, [key]: arr });
  }
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <legend style={{ fontWeight: 700 }}>{title}</legend>
      {children}
      <style>{`
        .input{border:1px solid #e5e7eb;padding:8px;border-radius:8px;width:100%;margin:6px 0}
        .textarea{border:1px solid #e5e7eb;padding:8px;border-radius:8px;width:100%;min-height:80px;margin:6px 0}
        .btn{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px;margin:6px 8px 0 0;cursor:pointer}
        .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:start}
        .sub{margin:8px 0 4px;font-weight:700}
      `}</style>
    </fieldset>
  );
}
