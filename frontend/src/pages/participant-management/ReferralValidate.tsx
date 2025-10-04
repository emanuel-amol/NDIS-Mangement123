// frontend/src/pages/participant-management/ReferralValidate.tsx - FINAL COMPLETE VERSION
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileDown, 
  Printer, 
  ArrowLeft,
  User,
  FileText
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

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
  
  // Client Details - ALL FIELDS
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
  
  // Representative Details - ALL FIELDS
  rep_first_name: string | null;
  rep_last_name: string | null;
  rep_phone_number: string | null;
  rep_email_address: string | null;
  rep_street_address: string | null;
  rep_city: string | null;
  rep_state: string | null;
  rep_postcode: string | null;
  rep_relationship: string | null;
  
  // NDIS Details - ALL FIELDS
  ndis_number: string | null;
  plan_type: string;
  plan_manager_name: string | null;
  plan_manager_agency: string | null;
  available_funding: string | null;
  plan_start_date: string;
  plan_review_date: string;
  client_goals: string;
  support_category: string;
  
  // Referrer Details - ALL FIELDS
  referrer_first_name: string;
  referrer_last_name: string;
  referrer_agency: string | null;
  referrer_role: string | null;
  referrer_email: string;
  referrer_phone: string;
  
  // Referral Details - ALL FIELDS
  referred_for: string;
  referred_for_other: string | null;
  reason_for_referral: string;
  urgency_level: string;
  current_supports: string | null;
  support_goals: string | null;
  accessibility_needs: string | null;
  cultural_considerations: string | null;
  
  // Consent
  consent_checkbox: boolean;
  
  // Status
  status: string;
  created_at: string;
  updated_at: string | null;
  internal_notes: string | null;
  
  // Files
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
      console.log('🔍 Fetching referral ID:', id);
      console.log('🔗 API URL:', `${API_BASE_URL}/participants/referrals/${id}`);
      
      const response = await fetch(`${API_BASE_URL}/participants/referrals/${id}`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ RECEIVED DATA:', data);
        console.log('📋 Total fields received:', Object.keys(data).length);
        console.log('📎 Files attached:', data.attached_files?.length || 0);
        
        // Log ALL fields to verify data
        console.log('CLIENT INFO:', {
          name: `${data.first_name} ${data.last_name}`,
          dob: data.date_of_birth,
          phone: data.phone_number,
          email: data.email_address,
          address: `${data.street_address}, ${data.city}, ${data.state} ${data.postcode}`,
          preferred_contact: data.preferred_contact,
          disability_type: data.disability_type
        });
        
        console.log('REP INFO:', {
          name: `${data.rep_first_name || ''} ${data.rep_last_name || ''}`,
          relationship: data.rep_relationship,
          phone: data.rep_phone_number,
          email: data.rep_email_address
        });
        
        console.log('NDIS INFO:', {
          ndis_number: data.ndis_number,
          plan_type: data.plan_type,
          support_category: data.support_category,
          plan_dates: `${data.plan_start_date} to ${data.plan_review_date}`,
          funding: data.available_funding,
          plan_manager: data.plan_manager_name
        });
        
        console.log('REFERRER INFO:', {
          name: `${data.referrer_first_name} ${data.referrer_last_name}`,
          agency: data.referrer_agency,
          role: data.referrer_role,
          email: data.referrer_email,
          phone: data.referrer_phone
        });
        
        console.log('REFERRAL INFO:', {
          referred_for: data.referred_for,
          referred_for_other: data.referred_for_other,
          reason: data.reason_for_referral,
          urgency: data.urgency_level,
          goals: data.client_goals
        });
        
        console.log('SUPPORT INFO:', {
          current_supports: data.current_supports,
          support_goals: data.support_goals,
          accessibility_needs: data.accessibility_needs,
          cultural_considerations: data.cultural_considerations
        });
        
        setReferral(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        alert('Referral not found');
        navigate('/referrals');
      }
    } catch (error) {
      console.error('❌ Error fetching referral:', error);
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

  const downloadPdf = () => {
    window.print();
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

  const statusColor = {
    submitted: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-purple-100 text-purple-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    converted: 'bg-teal-100 text-teal-800',
  }[referral.status] || 'bg-gray-100 text-gray-800';

  const urgencyColor = {
    urgent: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  }[referral.urgency_level] || 'bg-gray-100 text-gray-800';

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
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                {formatText(referral.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${urgencyColor}`}>
                {formatText(referral.urgency_level)} Priority
              </span>
              <button 
                onClick={downloadPdf} 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                <FileDown size={16} /> Download PDF
              </button>
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
                  {referral.rep_street_address && (
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                      <p className="text-gray-900">
                        {referral.rep_street_address}
                        {referral.rep_city && `, ${referral.rep_city}`}
                        {referral.rep_state && `, ${referral.rep_state}`}
                        {referral.rep_postcode && ` ${referral.rep_postcode}`}
                      </p>
                    </div>
                  )}
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
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${urgencyColor}`}>
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
                        href={`${API_BASE_URL}${file.file_url}`}
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