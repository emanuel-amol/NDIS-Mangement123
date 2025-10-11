// frontend/src/pages/care-workflow/CarePlanViewer.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, ArrowLeft, Edit, Calendar, User, CheckCircle, 
  Target, Users, MessageSquare, AlertCircle, Clock, History,
  FileText, Shield, Home
} from 'lucide-react';
import { auth } from '../../services/auth';

export default function CarePlanViewer() {
  const { participantId, versionId } = useParams<{ participantId: string; versionId?: string }>();
  const navigate = useNavigate();
  const [carePlan, setCarePlan] = useState<any>(null);
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

      // Load care plan (specific version or latest)
      let carePlanUrl = `${API_BASE_URL}/care/participants/${participantId}/care-plan`;
      if (versionId) {
        carePlanUrl = `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`;
      }

      const carePlanRes = await fetch(carePlanUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (carePlanRes.ok) {
        setCarePlan(await carePlanRes.json());
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading care plan...</p>
        </div>
      </div>
    );
  }

  if (!carePlan || !participant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Care Plan Not Found</h2>
          <p className="text-gray-600 mb-6">The care plan could not be loaded.</p>
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
                  <Heart className="h-6 w-6 text-pink-600" />
                  Care Plan - {participantName}
                  {versionId && (
                    <span className="text-sm text-gray-500 font-normal">
                      (Version {carePlan.version_number || versionId})
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
                      navigate(`/care/plan/${participantId}/versions/${versionId}/edit`);
                    } else {
                      navigate(`/care/plan/${participantId}/edit`);
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit size={16} />
                  Edit Plan
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
                  Viewing Version {carePlan.version_number || versionId}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Status: {carePlan.status || 'current'} • Created: {formatDate(carePlan.created_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plan Overview */}
        <div className="bg-white rounded-lg shadow border mb-6 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Overview</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Plan Name</label>
              <p className="text-gray-900 mt-1">{carePlan.plan_name || 'Untitled Care Plan'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Plan Period</label>
              <p className="text-gray-900 mt-1">{carePlan.plan_period || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Start Date</label>
              <p className="text-gray-900 mt-1">{formatDate(carePlan.start_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">End Date</label>
              <p className="text-gray-900 mt-1">{formatDate(carePlan.end_date)}</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        {carePlan.summary && (
          <div className="bg-white rounded-lg shadow border mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Summary
            </h2>
            <p className="text-gray-700 whitespace-pre-wrap">{carePlan.summary}</p>
          </div>
        )}

        {/* Strengths & Preferences */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {carePlan.participant_strengths && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Strengths
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{carePlan.participant_strengths}</p>
            </div>
          )}

          {carePlan.participant_preferences && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600" />
                Preferences
              </h2>
              {typeof carePlan.participant_preferences === 'string' ? (
                <p className="text-gray-700 whitespace-pre-wrap">{carePlan.participant_preferences}</p>
              ) : (
                <div className="space-y-3">
                  {carePlan.participant_preferences.likes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Likes</p>
                      <div className="flex flex-wrap gap-2">
                        {carePlan.participant_preferences.likes.map((like: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200">
                            {like}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {carePlan.participant_preferences.dislikes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Dislikes</p>
                      <div className="flex flex-wrap gap-2">
                        {carePlan.participant_preferences.dislikes.map((dislike: string, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-full border border-red-200">
                            {dislike}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goals */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {carePlan.short_goals && carePlan.short_goals.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Short-Term Goals
              </h2>
              <ul className="space-y-2">
                {carePlan.short_goals.map((goal: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{typeof goal === 'string' ? goal : goal.goal || goal.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {carePlan.long_goals && carePlan.long_goals.length > 0 && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Long-Term Goals
              </h2>
              <ul className="space-y-2">
                {carePlan.long_goals.map((goal: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{typeof goal === 'string' ? goal : goal.goal || goal.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Supports */}
        {carePlan.supports && carePlan.supports.length > 0 && (
          <div className="bg-white rounded-lg shadow border mb-6 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Support Services
            </h2>
            <div className="space-y-3">
              {carePlan.supports.map((support: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{support.service || support.name || 'Support Service'}</p>
                  {support.description && (
                    <p className="text-sm text-gray-600 mt-1">{support.description}</p>
                  )}
                  {support.frequency && (
                    <p className="text-xs text-gray-500 mt-1">Frequency: {support.frequency}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        <div className="grid grid-cols-1 gap-6">
          {carePlan.monitoring && (
  <div className="bg-white rounded-lg shadow border p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Clock className="h-5 w-5 text-yellow-600" />
      Monitoring & Review
    </h2>
    {typeof carePlan.monitoring === 'string' ? (
      <p className="text-gray-700 whitespace-pre-wrap">{carePlan.monitoring}</p>
    ) : (
      <div className="space-y-3">
        {carePlan.monitoring.progress_measures && (
          <div>
            <p className="text-sm font-medium text-gray-700">Progress Measures</p>
            <p className="text-gray-600 text-sm">{carePlan.monitoring.progress_measures}</p>
          </div>
        )}
        {carePlan.monitoring.review_cadence && (
          <div>
            <p className="text-sm font-medium text-gray-700">Review Cadence</p>
            <p className="text-gray-600 text-sm">{carePlan.monitoring.review_cadence}</p>
          </div>
        )}
        {carePlan.monitoring.reporting_requirements && (
          <div>
            <p className="text-sm font-medium text-gray-700">Reporting Requirements</p>
            <p className="text-gray-600 text-sm">{carePlan.monitoring.reporting_requirements}</p>
          </div>
        )}
        {carePlan.monitoring.key_contacts && (
          <div>
            <p className="text-sm font-medium text-gray-700">Key Contacts</p>
            <p className="text-gray-600 text-sm">{carePlan.monitoring.key_contacts}</p>
          </div>
        )}
      </div>
    )}
  </div>
)}

          {carePlan.risk_considerations && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-600" />
                Risk Considerations
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{carePlan.risk_considerations}</p>
            </div>
          )}

          {carePlan.communication_preferences && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Communication Preferences
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{carePlan.communication_preferences}</p>
            </div>
          )}

          {carePlan.cultural_considerations && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-600" />
                Cultural Considerations
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{carePlan.cultural_considerations}</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created: {formatDate(carePlan.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Updated: {formatDate(carePlan.updated_at)}
              </span>
            </div>
            {carePlan.status && (
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                carePlan.status === 'current' ? 'bg-green-100 text-green-800' :
                carePlan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {carePlan.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}