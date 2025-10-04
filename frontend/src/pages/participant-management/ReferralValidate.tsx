
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileDown, 
  Printer, 
  Info, 
  Link as LinkIcon, 
  Circle, 
  CircleCheck, 
  X,
  ArrowLeft
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

// Types
interface Attachment {
  id: string;
  name: string;
  url?: string;
  kind?: 'consent' | 'plan-summary' | 'id' | 'other';
}

interface SystemChecks {
  serviceableRegion: boolean;
  duplicateFound: boolean;
  submittedChannel?: 'web' | 'phone' | 'email' | 'api';
}

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string;
  email_address: string | null;
  date_of_birth?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  ndis_number?: string;
  status: string;
  created_at: string;
  disability_type: string;
  urgency_level: string;
  referred_for: string;
  reason_for_referral?: string;
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_phone: string;
  referrer_email?: string;
  referrer_relationship?: string;
  support_category?: string;
}

const ReferralValidate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [manualChecks, setManualChecks] = useState({
    idContactPresent: false,
    consentCaptured: false,
    regionCovered: false,
    noDuplicateActive: false,
    minimumDocs: false,
  });

  const [notes, setNotes] = useState('');
  const [requestInfoMsg, setRequestInfoMsg] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (id) {
      fetchReferral();
    }
  }, [id]);

  const fetchReferral = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/participants/referrals`);
      if (response.ok) {
        const referrals = await response.json();
        const found = referrals.find((r: any) => r.id === parseInt(id!));
        if (found) {
          setReferral(found);
        } else {
          alert('Referral not found');
          navigate('/referrals');
        }
      }
    } catch (error) {
      console.error('Error fetching referral:', error);
      alert('Failed to load referral');
    } finally {
      setLoading(false);
    }
  };

  // System checks (mock - replace with actual logic)
  const systemChecks: SystemChecks = useMemo(() => ({
    serviceableRegion: true,
    duplicateFound: false,
    submittedChannel: 'web'
  }), []);

  const auto = useMemo(() => {
    const serviceable = systemChecks.serviceableRegion;
    const noDup = !systemChecks.duplicateFound;
    return { serviceable, noDup };
  }, [systemChecks]);

  const allManualPassed = Object.values(manualChecks).every(Boolean);
  const validateEnabled = auto.serviceable && auto.noDup && allManualPassed && 
    (referral?.status === 'submitted' || referral?.status === 'pending');

  // Handlers
  const handleValidate = async () => {
    if (!validateEnabled || !referral) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/participants/create-from-referral/${referral.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        const result = await response.json();
        alert('Referral validated successfully!');
        navigate(`/participants/${result.id}`);
      } else {
        const error = await response.json();
        alert(`Failed to validate: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error validating referral:', error);
      alert('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!requestInfoMsg.trim()) return;
    // TODO: Implement request info API call
    alert('Request info functionality to be implemented');
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return;
    // TODO: Implement decline API call
    alert('Decline functionality to be implemented');
  };

  const downloadPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading referral...</p>
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Referral not found</p>
          <button 
            onClick={() => navigate('/referrals')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Referrals
          </button>
        </div>
      </div>
    );
  }

  const statusColor = {
    submitted: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    validated: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
  }[referral.status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/referrals')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft size={20} />
              Back
            </button>
            <h1 className="text-xl font-semibold">Review & Validate</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
              {referral.status}
            </span>
            {referral.urgency_level && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                {referral.urgency_level} priority
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            Submitted {new Date(referral.created_at).toLocaleString()} · {systemChecks.submittedChannel || 'web'}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_380px]">
        {/* Left: PDF-like preview */}
        <div id="pdf-like-container" className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Referral Snapshot</h2>
            <div className="flex gap-2">
              <button 
                onClick={downloadPdf} 
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
              >
                <FileDown size={16} /> Download PDF
              </button>
              <button 
                onClick={() => window.print()} 
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>

          {/* Participant */}
          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="mb-2 text-sm font-medium text-gray-500">Participant</div>
              <div className="text-gray-900 font-medium">
                {referral.first_name} {referral.last_name}
              </div>
              <dl className="mt-2 space-y-1 text-sm text-gray-700">
                {referral.date_of_birth && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">DOB</dt>
                    <dd>{new Date(referral.date_of_birth).toLocaleDateString()}</dd>
                  </div>
                )}
                {referral.phone_number && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Phone</dt>
                    <dd>{referral.phone_number}</dd>
                  </div>
                )}
                {referral.email_address && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd>{referral.email_address}</dd>
                  </div>
                )}
                {(referral.city || referral.state) && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Location</dt>
                    <dd>{[referral.city, referral.state].filter(Boolean).join(', ')}</dd>
                  </div>
                )}
                {referral.ndis_number && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">NDIS #</dt>
                    <dd>{referral.ndis_number}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Referrer */}
            <div className="rounded-lg border p-4">
              <div className="mb-2 text-sm font-medium text-gray-500">Referrer</div>
              <dl className="space-y-1 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd>{referral.referrer_first_name} {referral.referrer_last_name}</dd>
                </div>
                {referral.referrer_relationship && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Relationship</dt>
                    <dd>{referral.referrer_relationship}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-gray-500">Phone</dt>
                  <dd>{referral.referrer_phone}</dd>
                </div>
                {referral.referrer_email && (
                  <div className="flex items-center justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd>{referral.referrer_email}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>

          {/* Reason & requested services */}
          <section className="mb-6 rounded-lg border p-4">
            <div className="mb-2 text-sm font-medium text-gray-500">Reason & Requested Supports</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {referral.reason_for_referral || '—'}
            </p>
            {referral.referred_for && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                  {referral.referred_for}
                </span>
              </div>
            )}
            {referral.support_category && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Support Category: </span>
                <span className="text-xs text-gray-700">{referral.support_category}</span>
              </div>
            )}
          </section>

          {/* Disability Type */}
          <section className="rounded-lg border p-4">
            <div className="mb-2 text-sm font-medium text-gray-500">Disability Information</div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">Primary Disability: </span>
              {referral.disability_type?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </section>
        </div>

        {/* Right: Checklist & actions */}
        <aside className="space-y-4">
          {/* System checks */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">System checks</div>
            <div className="space-y-2 text-sm">
              <CheckRow label="Service region covered" ok={auto.serviceable} />
              <CheckRow label="No active duplicate found" ok={auto.noDup} />
            </div>
            {(!auto.serviceable || !auto.noDup) && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-xs text-yellow-800">
                <AlertTriangle size={16} />
                <p>Resolve the highlighted issues before validation.</p>
              </div>
            )}
          </div>

          {/* Manual checklist */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold">Validation checklist</div>
            <div className="space-y-3 text-sm">
              <ToggleRow
                label="Identity & contact present"
                checked={manualChecks.idContactPresent}
                onChange={(v) => setManualChecks((s) => ({ ...s, idContactPresent: v }))}
              />
              <ToggleRow
                label="Consent captured / documented"
                checked={manualChecks.consentCaptured}
                onChange={(v) => setManualChecks((s) => ({ ...s, consentCaptured: v }))}
              />
              <ToggleRow
                label="Service region covered"
                checked={manualChecks.regionCovered}
                onChange={(v) => setManualChecks((s) => ({ ...s, regionCovered: v }))}
              />
              <ToggleRow
                label="No active duplicate found"
                checked={manualChecks.noDuplicateActive}
                onChange={(v) => setManualChecks((s) => ({ ...s, noDuplicateActive: v }))}
              />
              <ToggleRow
                label="Minimum documents saved / noted"
                checked={manualChecks.minimumDocs}
                onChange={(v) => setManualChecks((s) => ({ ...s, minimumDocs: v }))}
              />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Internal notes (optional)
              </label>
              <textarea
                className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                rows={3}
                placeholder="Notes visible to internal staff only"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Request info / Decline */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-semibold">Alternate actions</div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Request more information
                </label>
                <textarea
                  className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  rows={2}
                  placeholder="Specify what's missing"
                  value={requestInfoMsg}
                  onChange={(e) => setRequestInfoMsg(e.target.value)}
                />
                <button
                  onClick={handleRequestInfo}
                  disabled={!requestInfoMsg.trim()}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Info size={16} /> Request info
                </button>
              </div>

              <div className="pt-2">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Decline referral
                </label>
                <textarea
                  className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-red-400"
                  rows={2}
                  placeholder="Provide a reason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <button
                  onClick={handleDecline}
                  disabled={!declineReason.trim()}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={16} /> Decline
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 border-t bg-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4">
          <div className="text-sm text-gray-500">
            Validate to mark this referral as <span className="font-medium text-gray-700">Prospective</span> and start onboarding.
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/referrals')}
              className="rounded-lg border px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleValidate}
              disabled={!validateEnabled || submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> 
              {submitting ? 'Validating...' : 'Validate & Mark Prospective'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-2">
      <span className="text-gray-700">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-green-700">
          <CircleCheck size={18} /> OK
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-gray-500">
          <Circle size={18} /> Pending
        </span>
      )}
    </div>
  );
}

function ToggleRow({ 
  label, 
  checked, 
  onChange 
}: { 
  label: string; 
  checked: boolean; 
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center justify-between rounded-lg border p-2">
      <span className="text-gray-700">{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default ReferralValidate;