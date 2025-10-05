import { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';

export default function CareSignoff() {
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

  const API_BASE_URL = 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadAllData();
  }, [participantId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const responses = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/onboarding-requirements`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`),
        fetch(`${API_BASE_URL}/quotations/participants/${participantId}/latest`),
        fetch(`${API_BASE_URL}/participants/${participantId}/documents`)
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

      // Process risk assessment (optional)
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
    if (!requirements?.can_onboard) {
      alert('Cannot onboard: ' + (requirements?.blocking_issues?.join(', ') || 'Requirements not met'));
      return;
    }

    if (!confirm(`Convert ${participant?.first_name} ${participant?.last_name} to onboarded status?`)) {
      return;
    }

    try {
      setConverting(true);
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/convert-to-onboarded`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      alert('Successfully converted to onboarded participant!');
      window.location.href = `/participants/${participantId}`;
    } catch (err) {
      console.error('Conversion error:', err);
      alert(`Conversion failed: ${err.message}`);
    } finally {
      setConverting(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    try {
      const url = `${API_BASE_URL}/participants/${participantId}/documents/${doc.id}/download`;
      const response = await fetch(url);
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
      // Fetch the document as a blob
      const url = `${API_BASE_URL}/participants/${participantId}/documents/${doc.id}/download?inline=true`;
      const response = await fetch(url);
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
          <p className="text-gray-600">Loading sign-off data...</p>
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
            onClick={() => window.location.href = '/dashboard'}
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = `/participants/${participantId}`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="border-l border-gray-300 h-6" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Care Sign-off & Onboarding</h1>
                <p className="text-sm text-gray-600">
                  Review and approve participant for service delivery
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
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                title="Dashboard"
              >
                <Home size={18} />
              </button>
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
                    <li key={idx}>• {issue}</li>
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
                  All required steps are complete. Review the information below and convert to active participant.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Requirements Checklist */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Onboarding Requirements</h2>
          </div>
          <div className="p-6 space-y-4">
            {/* Care Plan */}
            <div className="flex items-start gap-3">
              {requirements?.requirements?.care_plan?.finalised ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Care Plan (Required)</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    requirements?.requirements?.care_plan?.finalised
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {requirements?.requirements?.care_plan?.status || 'Incomplete'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {requirements?.requirements?.care_plan?.finalised
                    ? 'Care plan exists and is finalised'
                    : 'Care plan must exist and be finalised'}
                </p>
                {carePlan && (
                  <button
                    onClick={() => window.location.href = `/care/plan/${participantId}/edit`}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1"
                  >
                    View Care Plan <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="flex items-start gap-3">
              {requirements?.requirements?.risk_assessment?.exists ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Risk Assessment (Required)</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    requirements?.requirements?.risk_assessment?.exists
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {requirements?.requirements?.risk_assessment?.exists ? 'Complete' : 'Required'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {requirements?.requirements?.risk_assessment?.exists
                    ? 'Risk assessment completed and approved'
                    : 'Risk assessment must be completed before onboarding'}
                </p>
                <button
                  onClick={() => window.location.href = `/care/risk-assessment/${participantId}/edit`}
                  className="text-sm text-blue-600 hover:text-blue-700 mt-2 flex items-center gap-1"
                >
                  {riskAssessment ? 'View Risk Assessment' : 'Create Risk Assessment'} <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Care Plan Summary */}
        {carePlan && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Care Plan Summary
              </h2>
              <button
                onClick={() => window.location.href = `/care/plan/${participantId}/edit`}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Edit Plan <ExternalLink size={14} />
              </button>
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
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600 mb-1">Summary</p>
                  <p className="text-sm text-gray-800">{carePlan.summary}</p>
                </div>
              )}
              {carePlan.supports && Array.isArray(carePlan.supports) && carePlan.supports.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">Supports ({carePlan.supports.length})</p>
                  <div className="space-y-2">
                    {carePlan.supports.slice(0, 3).map((support, idx) => (
                      <div key={idx} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="font-medium">{support.type || support.support_type || 'Support Service'}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {support.frequency && `${support.frequency} • `}
                          {support.duration || 'Duration not specified'}
                        </div>
                      </div>
                    ))}
                    {carePlan.supports.length > 3 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        +{carePlan.supports.length - 3} more supports
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Assessment Summary */}
        {riskAssessment && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Risk Assessment Summary
              </h2>
              <button
                onClick={() => window.location.href = `/care/risk-assessment/${participantId}/edit`}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Edit Assessment <ExternalLink size={14} />
              </button>
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
                  <p className="font-medium">{riskAssessment.overall_risk_rating || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Review Date</p>
                  <p className="font-medium">{new Date(riskAssessment.review_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quotation */}
        {quotation && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Quotation
              </h2>
              <button
                onClick={() => window.location.href = `/quotations/participants/${participantId}`}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View Details <ExternalLink size={14} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Quote Number</p>
                  <p className="font-medium">{quotation.quote_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    quotation.status === 'final' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {quotation.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Amount</p>
                  <p className="font-medium text-lg text-green-600">${quotation.total?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Items</p>
                  <p className="font-medium">{quotation.items?.length || 0} services</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="px-6 py-4 border-b bg-gray-50">
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
                          {doc.category} • {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
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

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={() => window.location.href = `/participants/${participantId}`}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          
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
                Converting...
              </>
            ) : (
              <>
                <CheckSquare className="h-5 w-5" />
                Convert to Onboarded
              </>
            )}
          </button>
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
                ✕
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