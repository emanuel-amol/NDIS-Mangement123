// frontend/src/pages/referral/ReferralValidate.tsx - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  ArrowLeft,
  User,
  FileText
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

interface Attachment {
  file_id: string;
  original_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
  description?: string;
}

interface Referral {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone_number: string;
  email_address: string | null;
  street_address: string;
  city: string;
  state: string;
  postcode: string;
  preferred_contact: string;
  disability_type: string;
  rep_first_name: string | null;
  rep_last_name: string | null;
  rep_phone_number: string | null;
  rep_email_address: string | null;
  rep_street_address: string | null;
  rep_city: string | null;
  rep_state: string | null;
  rep_postcode: string | null;
  rep_relationship: string | null;
  ndis_number: string | null;
  plan_type: string;
  plan_manager_name: string | null;
  plan_manager_agency: string | null;
  available_funding: string | null;
  plan_start_date: string;
  plan_review_date: string;
  client_goals: string;
  support_category: string;
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_agency: string | null;
  referrer_role: string | null;
  referrer_email: string;
  referrer_phone: string;
  referred_for: string;
  referred_for_other: string | null;
  reason_for_referral: string;
  urgency_level: string;
  current_supports: string | null;
  support_goals: string | null;
  accessibility_needs: string | null;
  cultural_considerations: string | null;
  consent_checkbox: boolean;
  status: string;
  created_at: string;
  updated_at: string | null;
  internal_notes: string | null;
  attached_files: Attachment[];
}

const ReferralValidate: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchReferral();
    }
  }, [id]);

  const fetchReferral = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/participants/referrals/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        setReferral(data);
      } else {
        alert('Referral not found');
        navigate('/referrals');
      }
    } catch (error) {
      console.error('Error fetching referral:', error);
      alert('Failed to load referral');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!referral) return;
    
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

  const getFileDownloadUrl = (fileUrl: string) => {
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }
    // Remove /api/v1 from base URL since file.file_url already contains the full path
    const baseUrl = API_BASE_URL.replace('/api/v1', '');
    return `${baseUrl}${fileUrl}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not provided';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatText = (text: string | null | undefined) => {
    if (!text) return 'Not provided';
    return text.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-purple-100 text-purple-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'converted': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    const urgencyLower = urgency?.toLowerCase() || '';
    switch (urgencyLower) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading referral data...</p>
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Referral not found</p>
          <button 
            onClick={() => navigate('/referrals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Referrals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/referrals')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                Back to Referrals
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <h1 className="text-xl font-semibold">Referral Review - {referral.first_name} {referral.last_name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(referral.status)}`}>
                {formatText(referral.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(referral.urgency_level)}`}>
                {formatText(referral.urgency_level)} Priority
              </span>
              <button 
                onClick={() => window.print()} 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="p-8 space-y-8">

            {/* SECTION 1: PARTICIPANT INFORMATION */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="text-blue-600" size={24} />
                1. Participant Information
              </h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                  <p className="text-gray-900">{referral.first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                  <p className="text-gray-900">{referral.last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <p className="text-gray-900">{formatDate(referral.date_of_birth)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <p className="text-gray-900">{referral.phone_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <p className="text-gray-900">{referral.email_address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Preferred Contact Method</label>
                  <p className="text-gray-900">{formatText(referral.preferred_contact)}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">
                    {referral.street_address}<br/>
                    {referral.city}, {referral.state} {referral.postcode}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Primary Disability Type</label>
                  <p className="text-gray-900">{formatText(referral.disability_type)}</p>
                </div>
              </div>
            </section>

            {/* SECTION 2: REPRESENTATIVE DETAILS */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">2. Representative Details</h2>
              {referral.rep_first_name || referral.rep_last_name ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                    <p className="text-gray-900">{referral.rep_first_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                    <p className="text-gray-900">{referral.rep_last_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Relationship</label>
                    <p className="text-gray-900">{formatText(referral.rep_relationship)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                    <p className="text-gray-900">{referral.rep_phone_number || 'Not provided'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                    <p className="text-gray-900">{referral.rep_email_address || 'Not provided'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No representative information provided</p>
              )}
            </section>

            {/* SECTION 3: NDIS PLAN DETAILS */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">3. NDIS Plan Information</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">NDIS Number</label>
                  <p className="text-gray-900">{referral.ndis_number || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Type</label>
                  <p className="text-gray-900">{formatText(referral.plan_type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Support Category</label>
                  <p className="text-gray-900">{formatText(referral.support_category)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Available Funding</label>
                  <p className="text-gray-900">{referral.available_funding || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Start Date</label>
                  <p className="text-gray-900">{formatDate(referral.plan_start_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Review Date</label>
                  <p className="text-gray-900">{formatDate(referral.plan_review_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Manager Name</label>
                  <p className="text-gray-900">{referral.plan_manager_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Plan Manager Agency</label>
                  <p className="text-gray-900">{referral.plan_manager_agency || 'Not provided'}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Client Goals (from NDIS Plan)</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.client_goals}</p>
                </div>
              </div>
            </section>

            {/* SECTION 4: REFERRER INFORMATION */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">4. Referrer Information</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
                  <p className="text-gray-900">{referral.referrer_first_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
                  <p className="text-gray-900">{referral.referrer_last_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Agency/Organization</label>
                  <p className="text-gray-900">{referral.referrer_agency || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Role/Position</label>
                  <p className="text-gray-900">{formatText(referral.referrer_role)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                  <p className="text-gray-900">{referral.referrer_email}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number</label>
                  <p className="text-gray-900">{referral.referrer_phone}</p>
                </div>
              </div>
            </section>

            {/* SECTION 5: REFERRAL DETAILS */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">5. Referral Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Referred For</label>
                  <p className="text-gray-900">
                    {formatText(referral.referred_for)}
                    {referral.referred_for_other && ` - ${referral.referred_for_other}`}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Urgency Level</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(referral.urgency_level)}`}>
                    {formatText(referral.urgency_level)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Referral</label>
                  <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.reason_for_referral}</p>
                </div>
              </div>
            </section>

            {/* SECTION 6: SUPPORT INFORMATION */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">6. Support Information</h2>
              <div className="space-y-4">
                {referral.current_supports && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Current Supports & Services</label>
                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.current_supports}</p>
                  </div>
                )}
                {referral.support_goals && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Specific Support Goals</label>
                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.support_goals}</p>
                  </div>
                )}
                {!referral.current_supports && !referral.support_goals && (
                  <p className="text-gray-500 italic">No additional support information provided</p>
                )}
              </div>
            </section>

            {/* SECTION 7: ACCESSIBILITY & CULTURAL CONSIDERATIONS */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">7. Accessibility & Cultural Considerations</h2>
              <div className="space-y-4">
                {referral.accessibility_needs && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Accessibility Needs</label>
                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.accessibility_needs}</p>
                  </div>
                )}
                {referral.cultural_considerations && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cultural Considerations</label>
                    <p className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded border">{referral.cultural_considerations}</p>
                  </div>
                )}
                {!referral.accessibility_needs && !referral.cultural_considerations && (
                  <p className="text-gray-500 italic">No accessibility or cultural considerations provided</p>
                )}
              </div>
            </section>

            {/* SECTION 8: ATTACHED DOCUMENTS */}
            <section className="border-b pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FileText className="text-green-600" size={24} />
                8. Attached Documents ({referral.attached_files?.length || 0})
              </h2>
              {referral.attached_files && referral.attached_files.length > 0 ? (
                <div className="space-y-3">
                  {referral.attached_files.map((file, index) => (
                    <div key={file.file_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="text-blue-600" size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {index + 1}. {file.original_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatFileSize(file.file_size)} • Uploaded {formatDate(file.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <a
                        href={getFileDownloadUrl(file.file_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View / Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">No documents attached</p>
              )}
            </section>

            {/* SECTION 9: CONSENT & SUBMISSION */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-6">9. Consent & Submission Details</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Consent Provided</label>
                  <p className="text-gray-900">
                    {referral.consent_checkbox ? (
                      <span className="inline-flex items-center gap-2 text-green-700">
                        <CheckCircle2 size={20} /> Yes, consent obtained
                      </span>
                    ) : (
                      <span className="text-red-700">No consent recorded</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Submission Date</label>
                  <p className="text-gray-900">{formatDate(referral.created_at)}</p>
                </div>
                {referral.updated_at && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Last Updated</label>
                    <p className="text-gray-900">{formatDate(referral.updated_at)}</p>
                  </div>
                )}
                {referral.internal_notes && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Internal Notes</label>
                    <p className="text-gray-900 whitespace-pre-wrap bg-yellow-50 p-4 rounded border border-yellow-200">{referral.internal_notes}</p>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Action Footer */}
          <div className="border-t bg-gray-50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Add Internal Notes (Optional)</label>
                <textarea
                  className="w-96 rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Add any internal notes about this referral..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/referrals')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleValidate}
                  disabled={submitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  {submitting ? 'Validating...' : 'Validate & Convert to Participant'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReferralValidate;