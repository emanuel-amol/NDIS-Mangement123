import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";   // adjust path if needed

type Participant = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  referral: string | null;
};

export default function CareSetup() {
  const { participantId } = useParams<{ participantId: string }>();
  const [p, setP] = useState<Participant | null>(null);

  useEffect(() => {
    (async () => {
      if (!participantId) return;
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();
      if (!error && data) {
        setP(data as Participant);
      }
    })();
  }, [participantId]);

  if (!p) return <div>Loading…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Care Setup</h1>
      <p>
        <b>Participant:</b> {p.first_name} {p.last_name} <br />
        <b>Status:</b> {p.status} <br />
        <b>Referral:</b> {p.referral ?? "-"}
      </p>
      <div style={{ marginTop: 20 }}>
        <Card title="Care Plan" to={`/care/plan/${p.id}/edit`} />
        <Card title="Risk Assessment" to={`/care/risk/${p.id}/edit`} />
        <Card title="AI Assist" to={`/care/ai/${p.id}`} />
      </div>
    </div>
  );
}

function Card({ title, to }: { title: string; to: string }) {
  return (
    <div style={{ border: "1px solid #ddd", margin: 8, padding: 12 }}>
      <h3>{title}</h3>
      <Link to={to}>Open</Link>
    </div>
  );
}
