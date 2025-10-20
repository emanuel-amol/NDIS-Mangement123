import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type VerifyInfo = {
  candidate_name: string;
  referee_name: string;
  status: string; // e.g., "pending" | "submitted" | "invalid"
};

const ReferenceForm = () => {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<VerifyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [relationship, setRelationship] = useState("");
  const [comments, setComments] = useState("");
  const [recommend, setRecommend] = useState<undefined | boolean>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/v1/reference/${token}`, { signal: controller.signal });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `Invalid or expired link (status ${resp.status})`);
        }
        const data = (await resp.json()) as VerifyInfo;
        if (isMounted) setInfo(data);
      } catch (e) {
        if (isMounted) setError(e instanceof Error ? e.message : "Unable to load reference details");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    if (token) load();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (recommend === undefined) {
      setMessage("Please select whether you recommend the candidate.");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch(`/api/v1/reference/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, relationship: relationship || null, comments: comments || null, recommend }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Submission failed (status ${resp.status})`);
      }
      const json = (await resp.json().catch(() => null)) as { message?: string } | null;
      setMessage(json?.message || "Thanks! Your reference has been submitted.");
      // Mark as submitted locally
      setInfo((prev) => (prev ? { ...prev, status: "submitted" } : prev));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit reference right now");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: "24px", border: "1px solid #e5e7eb", borderRadius: 8 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Reference Check</h1>
      {loading && <p>Loading…</p>}
      {!loading && error && (
        <div style={{ color: "#b91c1c", background: "#fee2e2", padding: 12, borderRadius: 6 }}>{error}</div>
      )}
      {!loading && !error && info && (
        <>
          <p style={{ margin: "8px 0 16px" }}>
            Hi {info.referee_name}, please provide a reference for <strong>{info.candidate_name}</strong>.
          </p>
          {info.status === "submitted" ? (
            <div style={{ color: "#065f46", background: "#d1fae5", padding: 12, borderRadius: 6 }}>
              This reference has already been submitted. Thank you!
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Your relationship to the candidate</label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g., Former Manager at XYZ Co."
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6 }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Comments</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={6}
                  placeholder="Please share your experience working with the candidate..."
                  style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 6, resize: "vertical" }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontWeight: 500, marginBottom: 6 }}>Would you recommend this candidate?</label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="recommend"
                      checked={recommend === true}
                      onChange={() => setRecommend(true)}
                    />
                    Yes
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="recommend"
                      checked={recommend === false}
                      onChange={() => setRecommend(false)}
                    />
                    No
                  </label>
                </div>
              </div>
              {message && (
                <div style={{ marginBottom: 12, color: message.toLowerCase().includes("fail") || message.toLowerCase().includes("unable") ? "#b91c1c" : "#065f46" }}>
                  {message}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: submitting ? "#9ca3af" : "#2563eb",
                  color: "white",
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: 0,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Submitting…" : "Submit Reference"}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default ReferenceForm;
