import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  Heart,
  Shield,
  DollarSign,
  User,
  ArrowLeft,
  Download,
  Eye,
  CheckSquare,
  XCircle,
  Loader,
  Info,
  Home,
  ExternalLink,
  Clock
} from 'lucide-react';
import { auth, withAuth } from '../../services/auth';

export default function CareSignoff() {
  const navigate = useNavigate();
  
  // Get participant ID from URL
  const getParticipantIdFromUrl = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[pathParts.length - 1];
  };
  
  const [participantId] = useState(getParticipantIdFromUrl());
  const [participant, setParticipant] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);
  const userRole = (auth.role() || 'SUPPORT_WORKER').toUpperCase();
  const isServiceManager = userRole === 'SERVICE_MANAGER';

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadAllData();
  }, [participantId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const responses = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/onboarding-requirements`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/quotations/participants/${participantId}/latest`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/participants/${participantId}/documents`, { headers: withAuth() })
      ]);

      // Process participant
      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        setParticipant(await responses[0].value.json());
      }

      // Process workflow
      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        setWorkflow(await responses[1].value.json());
      }

      // Process requirements
      if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
        setRequirements(await responses[2].value.json());
      }

      // Process care plan
      if (responses[3].status === 'fulfilled' && responses[3].value.ok) {
        setCarePlan(await responses[3].value.json());
      }

      // Process risk assessment
      if (responses[4].status === 'fulfilled' && responses[4].value.ok) {
        setRiskAssessment(await responses[4].value.json());
      }

      // Process quotation
      if (responses[5].status === 'fulfilled' && responses[5].value.ok) {
        setQuotation(await responses[5].value.json());
      }

      // Process documents
      if (responses[6].status === 'fulfilled' && responses[6].value.ok) {
        const data = await responses[6].value.json();
        setDocuments(Array.isArray(data) ? data : []);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load participant data');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToOnboarded = async () => {
    if (!isServiceManager) {
      alert('Only service managers can convert participants.');
      return;
    }

    if (workflow?.manager_review_status !== 'approved') {
      alert('Manager approval required before conversion.');
      return;
    }

    if (!requirements?.can_onboard) {
      alert('Cannot onboard: ' + (requirements?.blocking_issues?.join(', ') || 'Requirements not met'));
      return;
    }

    if (!confirm(`Onboard ${participant?.first_name} ${participant?.last_name} as an active participant?`)) {
      return;
    }

    try {
      setConverting(true);
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/convert-to-onboarded`,
        {
          method: 'POST',
          headers: withAuth(),
          body: JSON.stringify({
            manager_name: 'System User',
            manager_title: 'Care Coordinator',
            approval_comments: 'Approved for onboarding',
            scheduled_start_date: new Date().toISOString()
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Conversion failed');
      }

      alert('Successfully onboarded participant!');
      navigate(`/participants/${participantId}`);
    } catch (err) {
      console.error('Conversion error:', err);
      alert(`Onboarding failed: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const url = `${API_BASE_URL}/participants/${participantId}/documents/${doc.id}/download`;
      const response = await fetch(url, { headers: withAuth() });
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = doc.original_filename || doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download document');
    }
  };

  const handleViewDocument = async (doc) => {
    try {
      const url = `${API_BASE_URL}/participants/${participantId}/documents/${doc.id}/download?inline=true`;
      const response = await fetch(url, { headers: withAuth() });
      if (!response.ok) throw new Error('Failed to load document');
      
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      
      setDocumentPreviewUrl(objectUrl);
      setSelectedDocument(doc);
    } catch (err) {
      console.error('View error:', err);
      alert('Failed to load document preview');
    }
  };

  const handleCloseDocumentViewer = () => {
    if (documentPreviewUrl) {
      window.URL.revokeObjectURL(documentPreviewUrl);
      setDocumentPreviewUrl(null);
    }
    setSelectedDocument(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading participant data...</p>
        </div>
      </div>
    );
  }

  if (error || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error || 'Participant not found'}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const canOnboard = requirements?.can_onboard || false;
  const blockingIssues = requirements?.blocking_issues || [];


    const workflowApproved = workflow?.manager_review_status === 'approved';
    const canShowConversion = isServiceManager && workflowApproved;
    let conversionBlockedMessage: string | null = null;
  if (!isServiceManager) {
    conversionBlockedMessage = 'Only service managers can onboard participants.';
  } else if (!workflowApproved) {
    conversionBlockedMessage = 'Manager approval required before onboarding.';
  } else if (!canOnboard) {
      conversionBlockedMessage = blockingIssues.length > 0
      ? `Resolve pending items: ${blockingIssues.join(', ')}`
      : 'Complete all onboarding requirements before conversion.';
  }

  // Check individual requirements
  const carePlanComplete = requirements?.requirements?.care_plan?.finalised || false;
  const riskAssessmentComplete = requirements?.requirements?.risk_assessment?.exists || false;
  const documentsGenerated = documents.length > 0;
  const quotationGenerated = quotation !== null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/participants/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Profile
              </button>
              <div className="border-l border-gray-300 h-6" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Participant Onboarding</h1>
                <p className="text-sm text-gray-600">
                  Review all requirements and onboard participant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {participant && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {participant.first_name} {participant.last_name}
                  </p>
                  <p className="text-xs text-gray-500">ID: {participant.id}</p>
                </div>
              )}
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Alert */}
        {!canOnboard && blockingIssues.length > 0 ? (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">Cannot Proceed to Onboarding</h3>
                <ul className="text-sm text-red-800 space-y-1">
                  {blockingIssues.map((issue, idx) => (
                    <li key={idx}> {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : canOnboard ? (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Ready for Onboarding</h3>
                <p className="text-sm text-green-800 mt-1">
                  All required steps are complete. Review the information below and onboard this participant.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Requirements Overview Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Care Plan */}
          <div className={`border-2 rounded-lg p-4 ${
            carePlanComplete ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <Heart className={`h-5 w-5 ${carePlanComplete ? 'text-green-600' : 'text-red-600'}`} />
              {carePlanComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Care Plan</h3>
            <p className={`text-xs ${carePlanComplete ? 'text-green-700' : 'text-red-700'}`}>
              {carePlanComplete ? 'Finalized' : 'Required'}
            </p>
          </div>

          {/* Risk Assessment */}
          <div className={`border-2 rounded-lg p-4 ${
            riskAssessmentComplete ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <Shield className={`h-5 w-5 ${riskAssessmentComplete ? 'text-green-600' : 'text-red-600'}`} />
              {riskAssessmentComplete ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Risk Assessment</h3>
            <p className={`text-xs ${riskAssessmentComplete ? 'text-green-700' : 'text-red-700'}`}>
              {riskAssessmentComplete ? 'Complete' : 'Required'}
            </p>
          </div>

          {/* Documents */}
          <div className={`border-2 rounded-lg p-4 ${
            documentsGenerated ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <FileText className={`h-5 w-5 ${documentsGenerated ? 'text-green-600' : 'text-yellow-600'}`} />
              {documentsGenerated ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Documents</h3>
            <p className={`text-xs ${documentsGenerated ? 'text-green-700' : 'text-yellow-700'}`}>
              {documentsGenerated ? `${documents.length} Generated` : 'Pending'}
            </p>
          </div>

          {/* Quotation */}
          <div className={`border-2 rounded-lg p-4 ${
            quotationGenerated ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <DollarSign className={`h-5 w-5 ${quotationGenerated ? 'text-green-600' : 'text-yellow-600'}`} />
              {quotationGenerated ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Quotation</h3>
            <p className={`text-xs ${quotationGenerated ? 'text-green-700' : 'text-yellow-700'}`}>
              {quotationGenerated ? 'Generated' : 'Pending'}
            </p>
          </div>
        </div>

        {/* Detailed Information Accordion */}
        <div className="space-y-4 mb-6">
          {/* Care Plan Details */}
          {carePlan && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-pink-600" />
                  Care Plan
                  <span className="text-sm text-gray-500 font-normal">
                    (v{carePlan.version_number || '1.0'})
                  </span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    carePlanComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {carePlanComplete ? 'Finalized' : 'Draft'}
                  </span>
                  <button
                    onClick={() => navigate(`/care/plan/${participantId}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Full Plan <ExternalLink size={14} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Plan Name</p>
                    <p className="font-medium">{carePlan.plan_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Plan Period</p>
                    <p className="font-medium">{carePlan.plan_period}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Start Date</p>
                    <p className="font-medium">{new Date(carePlan.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">End Date</p>
                    <p className="font-medium">{new Date(carePlan.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                {carePlan.summary && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-gray-600 mb-1 font-medium">Summary</p>
                    <p className="text-sm text-gray-800">{carePlan.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Risk Assessment Details */}
          {riskAssessment && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Risk Assessment
                  <span className="text-sm text-gray-500 font-normal">
                    (v{riskAssessment.version_number || '1.0'})
                  </span>
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    riskAssessmentComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {riskAssessmentComplete ? 'Complete' : 'Draft'}
                  </span>
                  <button
                    onClick={() => navigate(`/care/risk-assessment/${participantId}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Assessment <ExternalLink size={14} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Assessment Date</p>
                    <p className="font-medium">{new Date(riskAssessment.assessment_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Assessor</p>
                    <p className="font-medium">{riskAssessment.assessor_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Overall Risk Rating</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded font-medium ${
                      riskAssessment.overall_risk_rating === 'high' ? 'bg-red-100 text-red-800' :
                      riskAssessment.overall_risk_rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {riskAssessment.overall_risk_rating || 'Not specified'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Review Date</p>
                    <p className="font-medium">{new Date(riskAssessment.review_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quotation Details */}
          {quotation && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Service Quotation
                </h2>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    quotation.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {quotation.status}
                  </span>
                  <button
                    onClick={() => navigate(`/quotations/participants/${participantId}`)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    View Details <ExternalLink size={14} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Quote Number</p>
                    <p className="font-medium">{quotation.quote_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Amount</p>
                    <p className="font-medium text-lg text-green-600">${quotation.total?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Service Items</p>
                    <p className="font-medium">{quotation.items?.length || 0} items</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Valid Until</p>
                    <p className="font-medium">{quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Generated Documents ({documents.length})
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{doc.title}</p>
                          <p className="text-xs text-gray-500">
                            {doc.category}  {(doc.file_size / 1024).toFixed(1)} KB  {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDocument(doc)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View document"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                          title="Download document"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Final Checklist */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-2">Before Onboarding</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>? Verify all participant information is accurate</li>
                <li>? Ensure Care Plan and Risk Assessment are finalized</li>
                <li>? Confirm quotation has been generated and reviewed</li>
                <li>? Check that all required documents are present</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={() => navigate(`/participants/${participantId}`)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Profile
          </button>
          
          <div className="flex items-center gap-3">
            {conversionBlockedMessage && (
              <span className="px-3 py-1 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg">
                {conversionBlockedMessage}
              </span>
            )}
            {canShowConversion && (
              <button
                onClick={handleConvertToOnboarded}
                disabled={!canOnboard || converting}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  canOnboard && !converting
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {converting ? (
                  <>
                    <Loader className="animate-spin h-5 w-5" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-5 w-5" />
                    Onboard Participant
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-semibold text-gray-900">{selectedDocument.title}</h3>
              <button
                onClick={handleCloseDocumentViewer}
                className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-200 rounded transition-colors"
              >
                ?
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {documentPreviewUrl && selectedDocument.mime_type === 'application/pdf' ? (
                <iframe
                  src={documentPreviewUrl}
                  className="w-full h-full min-h-[600px] border-0 rounded"
                  title={selectedDocument.title}
                />
              ) : documentPreviewUrl && selectedDocument.mime_type?.startsWith('image/') ? (
                <img
                  src={documentPreviewUrl}
                  alt={selectedDocument.title}
                  className="max-w-full h-auto mx-auto rounded shadow"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                  <button
                    onClick={() => handleDownloadDocument(selectedDocument)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download File
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseDocumentViewer}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadDocument(selectedDocument)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
