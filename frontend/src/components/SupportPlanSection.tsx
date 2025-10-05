// frontend/src/components/SupportPlanSection.tsx - COMPLETE FILE
import { useState, useEffect } from 'react';
import { 
  FileText, Shield, GitBranch, Clock, CheckCircle, 
  Eye, Plus, Archive, AlertTriangle 
} from 'lucide-react';

interface Participant {
  id: number;
  first_name: string;
  last_name: string;
  status: string;
}

interface CarePlan {
  id: number;
  plan_name: string;
  plan_period?: string;
  start_date?: string;
  end_date?: string;
  summary?: string;
  supports?: any[];
}

interface RiskAssessment {
  id: number;
  assessor_name: string;
  assessment_date?: string;
  review_date?: string;
  overall_risk_rating?: string;
  risks?: any[];
}

interface Version {
  id: number;
  version_number: string;
  status: 'draft' | 'current' | 'archived';
  plan_name?: string;
  assessor_name?: string;
  revision_note?: string;
  created_at: string;
  published_at?: string;
  approved_by?: string;
}

interface Props {
  participant: Participant;
  userRole: string;
}

export default function SupportPlanSection({ participant, userRole }: Props) {
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [carePlanVersions, setCarePlanVersions] = useState<Version[]>([]);
  const [riskVersions, setRiskVersions] = useState<Version[]>([]);
  const [showCarePlanHistory, setShowCarePlanHistory] = useState(false);
  const [showRiskHistory, setShowRiskHistory] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
  const isServiceManager = userRole === 'service_manager' || userRole === 'admin';

  useEffect(() => {
    if (participant?.id) {
      loadData();
    }
  }, [participant?.id]);

  const loadData = async () => {
    try {
      // Load current care plan
      try {
        const cpResponse = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/care-plan`);
        if (cpResponse.ok) {
          setCarePlan(await cpResponse.json());
        }
      } catch (e) {
        console.log('No care plan found');
      }

      // Load current risk assessment
      try {
        const raResponse = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/risk-assessment`);
        if (raResponse.ok) {
          setRiskAssessment(await raResponse.json());
        }
      } catch (e) {
        console.log('No risk assessment found');
      }

      // Load care plan versions
      try {
        const cpvResponse = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/care-plan/versions`);
        if (cpvResponse.ok) {
          setCarePlanVersions(await cpvResponse.json());
        }
      } catch (e) {
        console.log('No care plan versions found');
      }

      // Load risk assessment versions
      try {
        const ravResponse = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/risk-assessment/versions`);
        if (ravResponse.ok) {
          setRiskVersions(await ravResponse.json());
        }
      } catch (e) {
        console.log('No risk assessment versions found');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const createCarePlanRevision = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/care-plan/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_version_id: 'current',
          revision_note: 'Service Manager initiated revision'
        })
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = result.edit_url;
      } else {
        alert('Failed to create revision');
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      alert('Error creating revision');
    }
  };

  const createRiskAssessmentRevision = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/care/participants/${participant.id}/risk-assessment/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_version_id: 'current',
          revision_note: 'Service Manager initiated revision'
        })
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = result.edit_url;
      } else {
        alert('Failed to create revision');
      }
    } catch (error) {
      console.error('Error creating revision:', error);
      alert('Error creating revision');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      current: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-600'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.archived}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Care Plan Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Care Plan
          </h3>
          
          {isServiceManager && carePlan && (
            <button
              onClick={createCarePlanRevision}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              Create Care Plan Revision
            </button>
          )}
        </div>

        <div className="p-6">
          {carePlan ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Plan Name</p>
                  <p className="font-medium text-sm">{carePlan.plan_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Period</p>
                  <p className="font-medium text-sm">{carePlan.plan_period || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Start Date</p>
                  <p className="font-medium text-sm">{formatDate(carePlan.start_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">End Date</p>
                  <p className="font-medium text-sm">{formatDate(carePlan.end_date)}</p>
                </div>
              </div>

              {carePlan.summary && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Summary</p>
                  <p className="text-sm text-gray-800">{carePlan.summary}</p>
                </div>
              )}

              {carePlan.supports && carePlan.supports.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">Active Supports ({carePlan.supports.length})</p>
                  <div className="space-y-2">
                    {carePlan.supports.slice(0, 3).map((support: any, idx: number) => (
                      <div key={idx} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                        <div className="font-medium">{support.type || 'Support Service'}</div>
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

              {carePlanVersions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowCarePlanHistory(!showCarePlanHistory)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <GitBranch size={14} />
                    View Plan History ({carePlanVersions.length} versions)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm mb-4">No care plan available</p>
              {isServiceManager && (
                <button
                  onClick={() => window.location.href = `/care/plan/${participant.id}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Create Care Plan
                </button>
              )}
            </div>
          )}
        </div>

        {showCarePlanHistory && carePlanVersions.length > 0 && (
          <div className="border-t bg-gray-50 p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Care Plan Version History
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {carePlanVersions.map((version) => (
                <div key={version.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">Version {version.version_number}</span>
                        {getStatusBadge(version.status)}
                        {version.status === 'current' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{version.plan_name}</p>
                      {version.revision_note && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{version.revision_note}"</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(version.created_at)}
                        </span>
                        {version.published_at && (
                          <span>Published: {formatDate(version.published_at)}</span>
                        )}
                        {version.approved_by && (
                          <span>By: {version.approved_by}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/care/plan/${participant.id}/versions/${version.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Risk Assessment Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Risk Assessment
          </h3>
          
          {isServiceManager && riskAssessment && (
            <button
              onClick={createRiskAssessmentRevision}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus size={16} />
              Create Risk Assessment Revision
            </button>
          )}
        </div>

        <div className="p-6">
          {riskAssessment ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Assessor</p>
                  <p className="font-medium text-sm">{riskAssessment.assessor_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Overall Risk Rating</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    riskAssessment.overall_risk_rating === 'high' ? 'bg-red-100 text-red-800' :
                    riskAssessment.overall_risk_rating === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {riskAssessment.overall_risk_rating || 'Not specified'}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Assessment Date</p>
                  <p className="font-medium text-sm">{formatDate(riskAssessment.assessment_date)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Review Date</p>
                  <p className="font-medium text-sm">{formatDate(riskAssessment.review_date)}</p>
                </div>
              </div>

              {riskAssessment.risks && riskAssessment.risks.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 mb-2">Identified Risks ({riskAssessment.risks.length})</p>
                  <div className="space-y-2">
                    {riskAssessment.risks.slice(0, 3).map((risk: any, idx: number) => (
                      <div key={idx} className="text-sm bg-red-50 p-3 rounded border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{risk.title || risk.category}</div>
                            <div className="text-xs text-gray-600 mt-1">{risk.description}</div>
                          </div>
                          {risk.riskLevel && (
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                              risk.riskLevel === 'high' ? 'bg-red-200 text-red-900' :
                              risk.riskLevel === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                              'bg-green-200 text-green-900'
                            }`}>
                              {risk.riskLevel}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {riskAssessment.risks.length > 3 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        +{riskAssessment.risks.length - 3} more risks
                      </p>
                    )}
                  </div>
                </div>
              )}

              {riskVersions.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowRiskHistory(!showRiskHistory)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <GitBranch size={14} />
                    View Assessment History ({riskVersions.length} versions)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 text-sm mb-4">No risk assessment available</p>
              {isServiceManager && (
                <button
                  onClick={() => window.location.href = `/care/risk-assessment/${participant.id}/edit`}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                >
                  Create Risk Assessment
                </button>
              )}
            </div>
          )}
        </div>

        {showRiskHistory && riskVersions.length > 0 && (
          <div className="border-t bg-gray-50 p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Risk Assessment Version History
            </h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {riskVersions.map((version) => (
                <div key={version.id} className="bg-white border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">Version {version.version_number}</span>
                        {getStatusBadge(version.status)}
                        {version.status === 'current' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">Assessor: {version.assessor_name}</p>
                      {version.revision_note && (
                        <p className="text-xs text-gray-500 mt-1 italic">"{version.revision_note}"</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(version.created_at)}
                        </span>
                        {version.published_at && (
                          <span>Published: {formatDate(version.published_at)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = `/care/risk-assessment/${participant.id}/versions/${version.id}/edit`}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}