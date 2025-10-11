// frontend/src/pages/care-workflow/RiskAssessmentViewer.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Shield, ArrowLeft, Edit, Calendar, User, AlertTriangle, 
  CheckCircle, Clock, History, FileText, Home, Bell
} from 'lucide-react';
import { auth } from '../../services/auth';

export default function RiskAssessmentViewer() {
  const { participantId, versionId } = useParams<{ participantId: string; versionId?: string }>();
  const navigate = useNavigate();
  const [riskAssessment, setRiskAssessment] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
  const isServiceManager = auth.role()?.toUpperCase() === 'SERVICE_MANAGER';

  useEffect(() => {
    loadData();
  }, [participantId, versionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load participant
      const participantRes = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (participantRes.ok) {
        setParticipant(await participantRes.json());
      }

      // Load risk assessment (specific version or latest)
      let riskAssessmentUrl = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment`;
      if (versionId) {
        riskAssessmentUrl = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`;
      }

      const riskAssessmentRes = await fetch(riskAssessmentUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (riskAssessmentRes.ok) {
        setRiskAssessment(await riskAssessmentRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }

  if (!riskAssessment || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Risk Assessment Not Found</h2>
          <p className="text-gray-600 mb-6">The risk assessment could not be loaded.</p>
          <button 
            onClick={() => navigate(`/participants/${participantId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="inline mr-2 h-4 w-4" />
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const participantName = `${participant.first_name} ${participant.last_name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/participants/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back to Profile
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Shield className="h-6 w-6 text-red-600" />
                  Risk Assessment - {participantName}
                  {versionId && (
                    <span className="text-sm text-gray-500 font-normal">
                      (Version {riskAssessment.version_number || versionId})
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-600">Read-only view</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/care/setup/${participantId}`)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Home size={16} />
                Care Setup
              </button>
              {isServiceManager && (
                <button
                  onClick={() => {
                    if (versionId) {
                      navigate(`/care/risk-assessment/${participantId}/versions/${versionId}/edit`);
                    } else {
                      navigate(`/care/risk-assessment/${participantId}/edit`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Edit size={16} />
                  Edit Assessment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Version & Status Banner */}
        {versionId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Viewing Version {riskAssessment.version_number || versionId}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Status: {riskAssessment.status || 'current'} • Created: {formatDate(riskAssessment.created_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Overall Risk Rating */}
        <div className="bg-white rounded-lg shadow border mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Overall Risk Rating</h2>
              <p className="text-sm text-gray-600">Assessment conducted on {formatDate(riskAssessment.assessment_date)}</p>
            </div>
            <div className={`px-6 py-3 rounded-lg border-2 ${getRiskLevelColor(riskAssessment.overall_risk_rating)}`}>
              <p className="text-2xl font-bold uppercase">{riskAssessment.overall_risk_rating || 'Not Rated'}</p>
            </div>
          </div>
        </div>

        {/* Assessment Details */}
        <div className="bg-white rounded-lg shadow border mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Details</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Assessor Name</label>
              <p className="text-gray-900 mt-1">{riskAssessment.assessor_name || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Assessor Role</label>
              <p className="text-gray-900 mt-1">{riskAssessment.assessor_role || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Assessment Date</label>
              <p className="text-gray-900 mt-1">{formatDate(riskAssessment.assessment_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Review Date</label>
              <p className="text-gray-900 mt-1 flex items-center gap-2">
                {formatDate(riskAssessment.review_date)}
                <Clock className="h-4 w-4 text-yellow-600" />
              </p>
            </div>
          </div>
        </div>

        {/* Context */}
        {riskAssessment.context && (
          <div className="bg-white rounded-lg shadow border mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Context
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.context}</p>
          </div>
        )}

        {/* Identified Risks */}
        {riskAssessment.risks && riskAssessment.risks.length > 0 && (
          <div className="bg-white rounded-lg shadow border mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Identified Risks
            </h2>
            <div className="space-y-4">
              {riskAssessment.risks.map((risk: any, idx: number) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${getRiskLevelColor(risk.level || risk.risk_level)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{risk.risk || risk.name || `Risk ${idx + 1}`}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRiskLevelColor(risk.level || risk.risk_level)}`}>
                      {risk.level || risk.risk_level || 'Unrated'}
                    </span>
                  </div>
                  {risk.description && (
                    <p className="text-sm text-gray-700 mb-2">{risk.description}</p>
                  )}
                  {risk.mitigation && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-xs font-medium text-gray-700 mb-1">Mitigation Strategy:</p>
                      <p className="text-sm text-gray-700">{risk.mitigation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Procedures */}
        {riskAssessment.emergency_procedures && (
          <div className="bg-white rounded-lg shadow border mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-600" />
              Emergency Procedures
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.emergency_procedures}</p>
          </div>
        )}

        {/* Additional Sections Grid */}
        <div className="grid grid-cols-1 gap-6">
          {riskAssessment.monitoring_requirements && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Monitoring Requirements
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.monitoring_requirements}</p>
            </div>
          )}

          {riskAssessment.staff_training_needs && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Staff Training Needs
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.staff_training_needs}</p>
            </div>
          )}

          {riskAssessment.equipment_requirements && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Equipment Requirements
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.equipment_requirements}</p>
            </div>
          )}

          {riskAssessment.environmental_modifications && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-600" />
                Environmental Modifications
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.environmental_modifications}</p>
            </div>
          )}

          {riskAssessment.communication_plan && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Communication Plan</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.communication_plan}</p>
            </div>
          )}

          {riskAssessment.family_involvement && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Family Involvement</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.family_involvement}</p>
            </div>
          )}

          {riskAssessment.external_services && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">External Services</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.external_services}</p>
            </div>
          )}

          {riskAssessment.review_schedule && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Review Schedule
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.review_schedule}</p>
            </div>
          )}

          {riskAssessment.notes && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{riskAssessment.notes}</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created: {formatDate(riskAssessment.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Updated: {formatDate(riskAssessment.updated_at)}
              </span>
            </div>
            {riskAssessment.approval_status && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                riskAssessment.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                riskAssessment.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {riskAssessment.approval_status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}