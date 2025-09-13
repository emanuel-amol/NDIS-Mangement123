// PROVIDER DASHBOARD (dynamic)
// frontend/src/pages/dashboards/provider.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

type Referral = {
  id: string | number;
  participantName?: string;      // FE name used in your mock
  serviceType?: string;
  status?: string;               // e.g. "NEW" | "IN_REVIEW" | "VALIDATED" | lowercase variants
  created_at?: string;

  // Backends vary — support either field name:
  participant_id?: string;
  participantId?: string;
};

const API_BASE_URL =
  (import.meta as any)?.env?.VITE_API_BASE_URL ||
  (process.env as any)?.REACT_APP_API_BASE_URL ||
  "http://localhost:8000/api/v1";

function normalizeStatus(s?: string): string {
  if (!s) return "UNKNOWN";
  const up = s.toUpperCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    PENDING: "IN_REVIEW",
    INREVIEW: "IN_REVIEW",
    IN_REVIEW: "IN_REVIEW",
    VALIDATED: "VALIDATED",
    NEW: "NEW",
    PROSPECT: "PROSPECT",
  };
  return map[up] || up;
}

function getParticipantId(r: Referral): string | undefined {
  return r.participant_id || r.participantId;
}

const ProviderReferralDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [referrals, setReferrals] = React.useState<Referral[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchReferrals = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/provider/referrals`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Referral[];

      // Ensure every row has a normalized status for UI logic
      const normalized = (data || []).map((r) => ({
        ...r,
        status: normalizeStatus(r.status),
      }));
      setReferrals(normalized);
    } catch (e: any) {
      setError(e?.message || "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const handleValidate = async (r: Referral) => {
    try {
      const res = await fetch(`${API_BASE_URL}/provider/referrals/${r.id}/validate`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as Referral;
      // normalize returned status
      updated.status = normalizeStatus(updated.status);
      setReferrals((cur) => cur.map((x) => (x.id === r.id ? updated : x)));
    } catch (e: any) {
      alert(e?.message || "Failed to validate referral");
    }
  };

  const handleCarePlan = (r: Referral) => {
    const pid = getParticipantId(r);
    if (!pid) {
      alert("Participant ID is missing on this referral. Validate/convert the referral first.");
      return;
    }
    navigate(`/participants/care/plan?participantId=${pid}`);
  };

  // Derived stats
  const validatedCount = referrals.filter((r) => normalizeStatus(r.status) === "VALIDATED").length;
  const pendingCount = referrals.filter((r) => normalizeStatus(r.status) !== "VALIDATED").length;
  // If you have a true participant count, replace this with the API value:
  const totalParticipants = referrals.length; // placeholder: count of rows

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Provider Dashboard</h1>
          <p className="text-sm text-gray-600">Review and validate participant referral data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReferrals}
            className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
            title="Refresh list"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Participants</dt>
              <dd className="text-3xl font-semibold text-gray-900">{totalParticipants}</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Validated Referrals</dt>
              <dd className="text-3xl font-semibold text-gray-900">{validatedCount}</dd>
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Pending Referrals</dt>
              <dd className="text-3xl font-semibold text-gray-900">{pendingCount}</dd>
            </dl>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Referrals</h3>

          {loading && <div className="text-sm text-gray-500">Loading referrals…</div>}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && referrals.length === 0 && (
            <div className="text-sm text-gray-500">No referrals yet.</div>
          )}

          <div className="space-y-4">
            {referrals.map((ref) => {
              const status = normalizeStatus(ref.status);
              const canValidate = status !== "VALIDATED";
              const canOpenCarePlan = status === "VALIDATED" || status === "PROSPECT";

              return (
                <div key={ref.id} className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-900 block">
                      Referral #{ref.id} — {ref.participantName || "Unknown"}{" "}
                      {ref.serviceType ? `(${ref.serviceType})` : ""}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {status.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Review ${ref.id} — implement details view`)}
                      className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 shadow-sm"
                    >
                      Review
                    </button>

                    <button
                      type="button"
                      onClick={() => handleValidate(ref)}
                      disabled={!canValidate}
                      className={`px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white shadow-sm ${
                        canValidate ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Validate
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCarePlan(ref)}
                      disabled={!canOpenCarePlan}
                      className={`px-4 py-2 border rounded-lg text-sm font-medium shadow-sm ${
                        canOpenCarePlan
                          ? "text-gray-700 bg-white hover:bg-gray-100"
                          : "text-gray-400 bg-gray-100 cursor-not-allowed"
                      }`}
                      title={canOpenCarePlan ? "Open Care Plan" : "Care Plan available after validation"}
                    >
                      Care Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProviderReferralDashboard;
