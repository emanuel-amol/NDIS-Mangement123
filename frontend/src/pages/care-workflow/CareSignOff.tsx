// frontend/src/pages/care-workflow/CareSignOff.tsx - FIXED AND WORKING
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle, AlertCircle, FileText, Heart, Shield, DollarSign, User,
  ArrowLeft, Download, Eye, CheckSquare, XCircle, Loader, Info, Home, Clock
} from 'lucide-react';
import { auth, withAuth } from '../../services/auth';

export default function CareSignoff() {
  const { participantId } = useParams();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState(null);
  
  const userRole = (auth.role() || 'SUPPORT_WORKER').toUpperCase();
  const isServiceManager = userRole === 'SERVICE_MANAGER';
  const canSubmitForReview = ['PROVIDER_ADMIN', 'SERVICE_MANAGER'].includes(userRole);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadAllData();
  }, [participantId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      const responses = await Promise.allSettled([
        fetch(`${API_BASE_URL}/participants/${participantId}`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/prospective-workflow`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/quotations/participants/${participantId}/latest`, { headers: withAuth() }),
        fetch(`${API_BASE_URL}/participants/${participantId}/documents`, { headers: withAuth() })
      ]);

      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        setParticipant(await responses[0].value.json());
      }

      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        setWorkflow(await responses[1].value.json());
      }

      if (responses[2].status === 'fulfilled' && responses[2].value.ok) {
        setCarePlan(await responses[2].value.json());
      }

      if (responses[3].status === 'fulfilled' && responses[3].value.ok) {
        setRiskAssessment(await responses[3].value.json());
      }

      if (responses[4].status === 'fulfilled' && responses[4].value.ok) {
        setQuotation(await responses[4].value.json());
      }

      if (responses[5].status === 'fulfilled' && responses[5].value.ok) {
        const data = await responses[5].value.json();
        setDocuments(Array.isArray(data) ? data : []);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load participant data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForManagerReview = async () => {
    if (!canSubmitForReview) {
      alert('You do not have permission to submit for manager review.');
      return;
    }

    // Check if care plan is finalized
    if (!carePlan?.is_finalised) {
      alert('Care plan must be finalized before submitting for review.');
      return;
    }

    // Check if quotation exists
    if (!quotation || quotation.status !== 'final') {
      alert('A finalized quotation is required before submitting for review.');
      return;
    }

    try {
      setSubmittingReview(true);
      
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/submit-for-manager-review`,
        {
          method: 'POST',
          headers: withAuth()
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Submission failed');
      }

      await loadAllData();
      alert('Successfully submitted for manager review!');
    } catch (err) {
      console.error('Manager review submission error:', err);
      alert(`Failed to submit: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleConvertToOnboarded = async () => {
    if (!isServiceManager) {
      alert('Only service managers can onboard participants.');
      return;
    }

    if (workflow?.manager_review_status !== 'approved') {
      alert('Manager approval required before onboarding.');
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
            manager_name: auth.user()?.full_name || 'System User',
            manager_title: 'Service Manager',
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
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const carePlanComplete = carePlan?.is_finalised || false;
  const riskAssessmentComplete = riskAssessment !== null;
  const documentsGenerated = documents.length > 0;
  const quotationGenerated = quotation !== null && quotation.status === 'final';
  
  const managerReviewStatus = workflow?.manager_review_status || 'not_requested';
  const workflowApproved = managerReviewStatus === 'approved';
  const canConvert = carePlanComplete && quotationGenerated && workflowApproved;

  // Determine what actions are available
  const canSubmit = carePlanComplete && quotationGenerated && managerReviewStatus === 'not_requested';
  const isPending = managerReviewStatus === 'pending';
  const isRejected = managerReviewStatus === 'rejected';

  const statusStyles = {
    not_requested: { label: 'Not Requested', className: 'bg-gray-100 text-gray-700' },
    pending: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  };
  const statusChip = statusStyles[managerReviewStatus] || statusStyles.not_requested;

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
                <h1 className="text-xl font-semibold text-gray-900">Onboarding Review</h1>
                <p className="text-sm text-gray-600">{participant.first_name} {participant.last_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {participant && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">ID: {participant.id}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Manager Review Status Banner */}
        <div className={`mb-6 rounded-lg p-4 border ${
          workflowApproved ? 'bg-green-50 border-green-200' :
          isPending ? 'bg-yellow-50 border-yellow-200' :
          isRejected ? 'bg-red-50 border-red-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {workflowApproved && <CheckCircle className="h-5 w-5 text-green-600" />}
              {isPending && <Clock className="h-5 w-5 text-yellow-600" />}
              {isRejected && <XCircle className="h-5 w-5 text-red-600" />}
              {managerReviewStatus === 'not_requested' && <Info className="h-5 w-5 text-gray-600" />}
              
              <div>
                <h3 className="font-semibold text-gray-900">Manager Review Status</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {workflowApproved && 'Approved and ready for onboarding'}
                  {isPending && 'Awaiting manager review'}
                  {isRejected && `Rejected: ${workflow?.manager_comments || 'No comments provided'}`}
                  {managerReviewStatus === 'not_requested' && 'Not yet submitted for review'}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusChip.className}`}>
              {statusChip.label}
            </span>
          </div>
        </div>

        {/* Requirements Overview */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className={`border-2 rounded-lg p-4 ${
            carePlanComplete ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <Heart className={`h-5 w-5 ${carePlanComplete ? 'text-green-600' : 'text-red-600'}`} />
              {carePlanComplete ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Care Plan</h3>
            <p className={`text-xs ${carePlanComplete ? 'text-green-700' : 'text-red-700'}`}>
              {carePlanComplete ? 'Finalized' : 'Required - Must Finalize'}
            </p>
          </div>

          <div className={`border-2 rounded-lg p-4 ${
            riskAssessmentComplete ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <Shield className={`h-5 w-5 ${riskAssessmentComplete ? 'text-green-600' : 'text-yellow-600'}`} />
              {riskAssessmentComplete ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-yellow-600" />}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Risk Assessment</h3>
            <p className={`text-xs ${riskAssessmentComplete ? 'text-green-700' : 'text-yellow-700'}`}>
              {riskAssessmentComplete ? 'Complete' : 'Optional'}
            </p>
          </div>

          <div className={`border-2 rounded-lg p-4 ${
            documentsGenerated ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <FileText className={`h-5 w-5 ${documentsGenerated ? 'text-green-600' : 'text-yellow-600'}`} />
              {documentsGenerated ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-yellow-600" />}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Documents</h3>
            <p className={`text-xs ${documentsGenerated ? 'text-green-700' : 'text-yellow-700'}`}>
              {documentsGenerated ? `${documents.length} Generated` : 'Pending'}
            </p>
          </div>

          <div className={`border-2 rounded-lg p-4 ${
            quotationGenerated ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <DollarSign className={`h-5 w-5 ${quotationGenerated ? 'text-green-600' : 'text-red-600'}`} />
              {quotationGenerated ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
            </div>
            <h3 className="font-semibold text-sm text-gray-900 mb-1">Quotation</h3>
            <p className={`text-xs ${quotationGenerated ? 'text-green-700' : 'text-red-700'}`}>
              {quotationGenerated ? 'Final' : 'Required'}
            </p>
          </div>
        </div>

        {/* Detail Cards */}
        {carePlan && (
          <div className="bg-white rounded-lg shadow-sm border mb-6 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Care Plan Summary
              </h2>
              <button
                onClick={() => navigate(`/care/plan/${participantId}`)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View Full Plan <Eye size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Plan Name</p>
                <p className="font-medium">{carePlan.plan_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  carePlan.is_finalised ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {carePlan.is_finalised ? 'Finalized' : 'Draft'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <button
            onClick={() => navigate(`/care/setup/${participantId}`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home size={16} />
            Care Setup
          </button>
          
          <div className="flex items-center gap-3">
            {/* Submit for Review Button */}
            {canSubmitForReview && canSubmit && (
              <button
                onClick={handleSubmitForManagerReview}
                disabled={submittingReview}
                className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReview ? (
                  <>
                    <Loader className="animate-spin h-5 w-5" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-5 w-5" />
                    Submit for Manager Review
                  </>
                )}
              </button>
            )}

            {/* Onboard Button - Only for approved items */}
            {isServiceManager && workflowApproved && (
              <button
                onClick={handleConvertToOnboarded}
                disabled={!canConvert || converting}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all ${
                  canConvert && !converting
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

        {/* Blocking Messages */}
        {!carePlanComplete && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                Care Plan must be finalized before submitting for review
              </p>
            </div>
          </div>
        )}
        
        {!quotationGenerated && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-800">
                A finalized quotation is required before submitting for review
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}