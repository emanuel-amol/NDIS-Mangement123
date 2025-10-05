// frontend/src/pages/care-workflow/RiskAssessmentEditor.tsx - COMPLETE WITH VERSIONING SUPPORT
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Shield, Check, X, AlertTriangle } from 'lucide-react';

interface Risk {
  category: string;
  description: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  mitigation: string;
  responsiblePerson: string;
}

interface RiskAssessmentData {
  id?: number;
  participant_id?: number;
  assessment_date: string;
  assessor_name: string;
  assessor_role: string;
  review_date: string;
  context: {
    living_situation: string;
    daily_activities: string;
    health_conditions: string;
    support_network: string;
  };
  risks: Risk[];
  overall_risk_rating: string;
  emergency_procedures: string;
  monitoring_requirements: string;
  staff_training_needs: string;
  equipment_requirements: string;
  environmental_modifications: string;
  communication_plan: string;
  family_involvement: string;
  external_services: string;
  review_schedule: string;
  notes: string;
  approval_status?: string;
  version_number?: string;
  status?: string;
}

export default function RiskAssessmentEditor() {
  const { participantId, versionId } = useParams();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentData>({
    assessment_date: new Date().toISOString().split('T')[0],
    assessor_name: '',
    assessor_role: '',
    review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    context: {
      living_situation: '',
      daily_activities: '',
      health_conditions: '',
      support_network: ''
    },
    risks: [],
    overall_risk_rating: 'low',
    emergency_procedures: '',
    monitoring_requirements: '',
    staff_training_needs: '',
    equipment_requirements: '',
    environmental_modifications: '',
    communication_plan: '',
    family_involvement: '',
    external_services: '',
    review_schedule: 'Monthly',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    context: true,
    risks: true,
    procedures: true,
    requirements: true,
    additional: true
  });
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  useEffect(() => {
    loadData();
  }, [participantId, versionId]);

  const loadData = async () => {
    try {
      // Load participant
      const pRes = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setParticipant(pData);
      }

      if (versionId) {
        // Version editing mode
        setIsVersionMode(true);
        const vRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVersionData(vData);
          setRiskAssessment({
            ...vData,
            context: vData.context || { living_situation: '', daily_activities: '', health_conditions: '', support_network: '' },
            risks: vData.risks || []
          });
        }
      } else {
        // Regular editing mode - load current risk assessment
        try {
          const raRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`);
          if (raRes.ok) {
            const raData = await raRes.json();
            setRiskAssessment({
              ...raData,
              context: raData.context || { living_situation: '', daily_activities: '', health_conditions: '', support_network: '' },
              risks: raData.risks || []
            });
          }
        } catch (e) {
          console.log('No existing risk assessment, creating new');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let endpoint;
      let method;
      let body;

      if (isVersionMode && versionId) {
        // Save version
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`;
        method = 'PUT';
        body = JSON.stringify(riskAssessment);
      } else {
        // Save regular risk assessment
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment`;
        method = riskAssessment.id ? 'PUT' : 'POST';
        body = JSON.stringify(riskAssessment);
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        alert('Risk assessment saved successfully');
        if (!isVersionMode) {
          navigate(`/participants/${participantId}`);
        }
      } else {
        alert('Failed to save risk assessment');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving risk assessment');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishVersion = async () => {
    if (!confirm('Publish this version as current? This will archive the previous current version.')) return;
    
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}/publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved_by: 'Service Manager' })
        }
      );

      if (response.ok) {
        alert('Version published successfully!');
        navigate(`/participants/${participantId}`);
      } else {
        alert('Failed to publish version');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error publishing version');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardVersion = async () => {
    if (!confirm('Discard this draft version? This cannot be undone.')) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        navigate(`/participants/${participantId}`);
      } else {
        alert('Failed to discard version');
      }
    } catch (error) {
      console.error('Error discarding:', error);
      alert('Error discarding version');
    }
  };

  // Risk management
  const addRisk = () => {
    setRiskAssessment({
      ...riskAssessment,
      risks: [...riskAssessment.risks, {
        category: '',
        description: '',
        likelihood: 'medium',
        impact: 'medium',
        riskLevel: 'medium',
        mitigation: '',
        responsiblePerson: ''
      }]
    });
  };

  const updateRisk = (index: number, field: keyof Risk, value: string) => {
    const updated = [...riskAssessment.risks];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate risk level based on likelihood and impact
    if (field === 'likelihood' || field === 'impact') {
      const likelihood = field === 'likelihood' ? value : updated[index].likelihood;
      const impact = field === 'impact' ? value : updated[index].impact;
      
      if (likelihood === 'high' || impact === 'high') {
        updated[index].riskLevel = 'high';
      } else if (likelihood === 'low' && impact === 'low') {
        updated[index].riskLevel = 'low';
      } else {
        updated[index].riskLevel = 'medium';
      }
    }
    
    setRiskAssessment({ ...riskAssessment, risks: updated });
  };

  const removeRisk = (index: number) => {
    setRiskAssessment({
      ...riskAssessment,
      risks: riskAssessment.risks.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-6 w-6 text-red-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {isVersionMode ? `Edit Risk Assessment v${versionData?.version_number}` : 'Edit Risk Assessment'}
              </h1>
              {isVersionMode && versionData && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  versionData.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                }`}>
                  {versionData.status}
                </span>
              )}
            </div>
            {participant && (
              <p className="text-sm text-gray-600">
                For: {participant.first_name} {participant.last_name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <Save size={16} />
              Save {isVersionMode ? 'Draft' : ''}
            </button>

            {isVersionMode && versionData?.status === 'draft' && (
              <>
                <button
                  onClick={handlePublishVersion}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Check size={16} />
                  Publish
                </button>
                <button
                  onClick={handleDiscardVersion}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  <X size={16} />
                  Discard
                </button>
              </>
            )}

            <button
              onClick={() => navigate(`/participants/${participantId}`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {isVersionMode && versionData?.revision_note && (
          <div className="px-6 py-3 bg-blue-50 border-b">
            <p className="text-sm text-blue-800">
              <strong>Revision Note:</strong> {versionData.revision_note}
            </p>
          </div>
        )}
      </div>

      {/* Assessment Overview Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Assessment Overview</h2>
          {expandedSections.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.overview && (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessor Name *</label>
                <input
                  type="text"
                  value={riskAssessment.assessor_name}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, assessor_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="Name of person conducting assessment"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessor Role</label>
                <input
                  type="text"
                  value={riskAssessment.assessor_role}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, assessor_role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., Service Manager, Support Coordinator"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Date *</label>
                <input
                  type="date"
                  value={riskAssessment.assessment_date}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, assessment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Date *</label>
                <input
                  type="date"
                  value={riskAssessment.review_date}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, review_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Risk Rating</label>
                <select
                  value={riskAssessment.overall_risk_rating}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, overall_risk_rating: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Schedule</label>
                <select
                  value={riskAssessment.review_schedule}
                  onChange={(e) => setRiskAssessment({ ...riskAssessment, review_schedule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Context Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('context')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Context & Environment</h2>
          {expandedSections.context ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.context && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Living Situation</label>
              <textarea
                value={riskAssessment.context.living_situation}
                onChange={(e) => setRiskAssessment({
                  ...riskAssessment,
                  context: { ...riskAssessment.context, living_situation: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Describe the participant's living environment..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Activities</label>
              <textarea
                value={riskAssessment.context.daily_activities}
                onChange={(e) => setRiskAssessment({
                  ...riskAssessment,
                  context: { ...riskAssessment.context, daily_activities: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Describe typical daily activities and routines..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Health Conditions</label>
              <textarea
                value={riskAssessment.context.health_conditions}
                onChange={(e) => setRiskAssessment({
                  ...riskAssessment,
                  context: { ...riskAssessment.context, health_conditions: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Relevant health conditions or medical considerations..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Network</label>
              <textarea
                value={riskAssessment.context.support_network}
                onChange={(e) => setRiskAssessment({
                  ...riskAssessment,
                  context: { ...riskAssessment.context, support_network: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Describe support network (family, friends, services)..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Identified Risks Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('risks')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Identified Risks</h2>
          {expandedSections.risks ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.risks && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">Document all identified risks and mitigation strategies</p>
              <button
                onClick={addRisk}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <Plus size={16} /> Add Risk
              </button>
            </div>

            <div className="space-y-4">
              {riskAssessment.risks.map((risk, index) => (
                <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium text-gray-900">Risk {index + 1}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        risk.riskLevel === 'high' ? 'bg-red-200 text-red-900' :
                        risk.riskLevel === 'medium' ? 'bg-yellow-200 text-yellow-900' :
                        'bg-green-200 text-green-900'
                      }`}>
                        {risk.riskLevel} risk
                      </span>
                    </div>
                    <button
                      onClick={() => removeRisk(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={risk.category}
                          onChange={(e) => updateRisk(index, 'category', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">Select category...</option>
                          <option value="Physical Safety">Physical Safety</option>
                          <option value="Health">Health</option>
                          <option value="Behavioral">Behavioral</option>
                          <option value="Environmental">Environmental</option>
                          <option value="Psychosocial">Psychosocial</option>
                          <option value="Financial">Financial</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Responsible Person</label>
                        <input
                          type="text"
                          value={risk.responsiblePerson}
                          onChange={(e) => updateRisk(index, 'responsiblePerson', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                          placeholder="Who manages this risk?"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <textarea
                        value={risk.description}
                        onChange={(e) => updateRisk(index, 'description', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="Describe the risk in detail..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Likelihood</label>
                        <select
                          value={risk.likelihood}
                          onChange={(e) => updateRisk(index, 'likelihood', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Impact</label>
                        <select
                          value={risk.impact}
                          onChange={(e) => updateRisk(index, 'impact', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mitigation Strategy</label>
                      <textarea
                        value={risk.mitigation}
                        onChange={(e) => updateRisk(index, 'mitigation', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        placeholder="How will this risk be managed or mitigated?"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {riskAssessment.risks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6">No risks identified yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Procedures Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('procedures')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Emergency Procedures</h2>
          {expandedSections.procedures ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.procedures && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Procedures</label>
              <textarea
                value={riskAssessment.emergency_procedures}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, emergency_procedures: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Detail emergency response procedures..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication Plan</label>
              <textarea
                value={riskAssessment.communication_plan}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, communication_plan: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="How will emergencies be communicated?"
              />
            </div>
          </div>
        )}
      </div>

      {/* Requirements Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('requirements')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Requirements & Support</h2>
          {expandedSections.requirements ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.requirements && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Requirements</label>
              <textarea
                value={riskAssessment.monitoring_requirements}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, monitoring_requirements: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="What monitoring is required?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Training Needs</label>
              <textarea
                value={riskAssessment.staff_training_needs}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, staff_training_needs: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="What training do staff need?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Requirements</label>
              <textarea
                value={riskAssessment.equipment_requirements}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, equipment_requirements: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Special equipment needed..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Modifications</label>
              <textarea
                value={riskAssessment.environmental_modifications}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, environmental_modifications: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Required environmental changes..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('additional')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Additional Information</h2>
          {expandedSections.additional ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.additional && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family Involvement</label>
              <textarea
                value={riskAssessment.family_involvement}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, family_involvement: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="How are family members involved?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External Services</label>
              <textarea
                value={riskAssessment.external_services}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, external_services: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="External services or specialists involved..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={riskAssessment.notes}
                onChange={(e) => setRiskAssessment({ ...riskAssessment, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                placeholder="Any additional information or notes..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button at Bottom */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => navigate(`/participants/${participantId}`)}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : `Save ${isVersionMode ? 'Draft' : 'Risk Assessment'}`}
        </button>
      </div>
    </div>
  );
}