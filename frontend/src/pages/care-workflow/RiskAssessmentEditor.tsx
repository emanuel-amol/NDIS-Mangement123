// frontend/src/pages/care-workflow/RiskAssessmentEditor.tsx - FINAL COMPLETE FIXED VERSION
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Shield, Check, X } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('assessments');
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
  const [isVersionMode, setIsVersionMode] = useState(false);
  const [versionData, setVersionData] = useState<any>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

  const calculateRiskRating = (likelihood: string, impact: string): string => {
    const riskMatrix = {
      'low-low': 'low',
      'low-medium': 'low',
      'low-high': 'medium',
      'medium-low': 'low',
      'medium-medium': 'medium',
      'medium-high': 'high',
      'high-low': 'medium',
      'high-medium': 'high',
      'high-high': 'high'
    };
    return riskMatrix[`${likelihood}-${impact}`] || 'medium';
  };

  // CRITICAL: Transform backend risk to frontend format
  const transformBackendRiskToFrontend = (backendRisk: any): Risk => {
    return {
      category: backendRisk.category || '',
      description: backendRisk.description || backendRisk.title || '',
      likelihood: backendRisk.likelihood || '',
      impact: backendRisk.impact || '',
      riskLevel: backendRisk.riskLevel || backendRisk.risk_level || '',
      mitigation: backendRisk.mitigation || backendRisk.mitigationStrategies || '', // KEY FIX
      responsiblePerson: backendRisk.responsiblePerson || backendRisk.responsible_person || ''
    };
  };

  // Transform backend context to frontend format
  const transformBackendContextToFrontend = (backendContext: any) => {
    if (!backendContext) {
      return {
        living_situation: '',
        daily_activities: '',
        health_conditions: '',
        support_network: ''
      };
    }

    // Backend sends BOTH old and new fields, prioritize new ones
    return {
      living_situation: backendContext.living_situation || backendContext.environment || '',
      daily_activities: backendContext.daily_activities || backendContext.activities_assessed || '',
      health_conditions: backendContext.health_conditions || '',
      support_network: backendContext.support_network || backendContext.supports_involved || ''
    };
  };

  // Complete transformation function
  const transformBackendDataToFrontend = (backendData: any): RiskAssessmentData => {
    console.log('🔄 Transforming backend data:', backendData);
    
    const transformed = {
      id: backendData.id,
      participant_id: backendData.participant_id,
      assessment_date: backendData.assessment_date || new Date().toISOString().split('T')[0],
      assessor_name: backendData.assessor_name || '',
      assessor_role: backendData.assessor_role || '',
      review_date: backendData.review_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      context: transformBackendContextToFrontend(backendData.context),
      risks: Array.isArray(backendData.risks) 
        ? backendData.risks.map(transformBackendRiskToFrontend)
        : [],
      overall_risk_rating: backendData.overall_risk_rating || 'low',
      emergency_procedures: backendData.emergency_procedures || '',
      monitoring_requirements: backendData.monitoring_requirements || '',
      staff_training_needs: backendData.staff_training_needs || '',
      equipment_requirements: backendData.equipment_requirements || '',
      environmental_modifications: backendData.environmental_modifications || '',
      communication_plan: backendData.communication_plan || '',
      family_involvement: backendData.family_involvement || '',
      external_services: backendData.external_services || '',
      review_schedule: backendData.review_schedule || 'Monthly',
      notes: backendData.notes || '',
      approval_status: backendData.approval_status,
      version_number: backendData.version_number,
      status: backendData.status
    };

    console.log('✅ Transformed data:', transformed);
    return transformed;
  };

  const tabs = [
    { id: 'assessments', label: 'Risk Assessments' },
    { id: 'rating', label: 'Risk Rating' },
    { id: 'mgt', label: 'Risk MGT' },
    { id: 'monitoring', label: 'Risk Monitoring' },
    { id: 'mitigation', label: 'Risk Mitigation' }
  ];

  useEffect(() => {
    loadData();
  }, [participantId, versionId]);

  const loadCurrentRiskAssessment = async () => {
    try {
      const raRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment`);
      if (raRes.ok) {
        const raData = await raRes.json();
        console.log('✅ Loaded current risk assessment');
        const transformed = transformBackendDataToFrontend(raData);
        setRiskAssessment(transformed);
        return true;
      } else {
        console.log('ℹ️ No current risk assessment found');
        return false;
      }
    } catch (e) {
      console.error('❌ Error loading current risk assessment:', e);
      return false;
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load participant data
      const pRes = await fetch(`${API_BASE_URL}/participants/${participantId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setParticipant(pData);
        console.log('✅ Loaded participant:', pData.first_name, pData.last_name);
      }

      if (versionId) {
        // VERSION MODE: Loading a specific version for editing
        console.log('📋 Loading version:', versionId);
        setIsVersionMode(true);
        
        const vRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`);
        if (vRes.ok) {
          const vData = await vRes.json();
          console.log('✅ Loaded version data (raw):', vData);
          setVersionData(vData);
          
          // CRITICAL: Transform the data before setting state
          const transformed = transformBackendDataToFrontend(vData);
          setRiskAssessment(transformed);
          
          console.log('✅ Version data loaded and transformed');
        } else {
          console.error('❌ Failed to load version, status:', vRes.status);
          alert('Failed to load version. Loading current risk assessment instead.');
          await loadCurrentRiskAssessment();
        }
      } else {
        // NORMAL MODE: Load current risk assessment
        console.log('📋 Loading current risk assessment');
        await loadCurrentRiskAssessment();
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let endpoint;
      let method;
      let body;

      if (isVersionMode && versionId) {
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`;
        method = 'PUT';
        body = JSON.stringify(riskAssessment);
        console.log('💾 Updating version:', versionId);
      } else {
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/risk-assessment`;
        method = riskAssessment.id ? 'PUT' : 'POST';
        body = JSON.stringify(riskAssessment);
        console.log('💾 Saving risk assessment:', method);
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Save successful:', result);
        alert('Risk assessment saved successfully');
        if (!isVersionMode) {
          navigate(`/participants/${participantId}`);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Save failed:', errorData);
        alert('Failed to save risk assessment: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error saving:', error);
      alert('Error saving risk assessment: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishVersion = async () => {
    if (!confirm('Publish this version as current? This will replace the current risk assessment.')) return;
    
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
        const result = await response.json();
        console.log('✅ Version published:', result);
        alert('Version published successfully!');
        navigate(`/participants/${participantId}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Publish failed:', errorData);
        alert('Failed to publish version: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error publishing:', error);
      alert('Error publishing version: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!confirm('Are you sure you want to discard this draft? This cannot be undone.')) return;
    
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/risk-assessment/versions/${versionId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log('✅ Draft discarded');
        alert('Draft discarded successfully');
        navigate(`/participants/${participantId}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Discard failed:', errorData);
        alert('Failed to discard draft: ' + (errorData.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error discarding:', error);
      alert('Error discarding draft: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addRisk = () => {
    setRiskAssessment({
      ...riskAssessment,
      risks: [...riskAssessment.risks, {
        category: 'Physical Safety',
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
    
    if (field === 'likelihood' || field === 'impact') {
      const likelihood = field === 'likelihood' ? value : updated[index].likelihood;
      const impact = field === 'impact' ? value : updated[index].impact;
      updated[index].riskLevel = calculateRiskRating(likelihood, impact);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {isVersionMode ? 'Risk Assessment Version Editor' : 'Risk Assessment Editor'}
              </h1>
              {participant && (
                <p className="text-sm text-gray-600">
                  {participant.first_name} {participant.last_name}
                  {isVersionMode && versionData && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                      Version {versionData.version_number} ({versionData.status})
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/participants/${participantId}`)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
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

      {/* Risk Assessment Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-gray-900 border-gray-900'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* ASSESSMENTS TAB */}
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Overview</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessor Name *</label>
                    <input
                      type="text"
                      value={riskAssessment.assessor_name}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, assessor_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Name of person conducting assessment"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessor Role</label>
                    <input
                      type="text"
                      value={riskAssessment.assessor_role}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, assessor_role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Service Manager, Support Coordinator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Date *</label>
                    <input
                      type="date"
                      value={riskAssessment.assessment_date}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, assessment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Date *</label>
                    <input
                      type="date"
                      value={riskAssessment.review_date}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, review_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-3">Context & Environment</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Living Situation</label>
                    <textarea
                      value={riskAssessment.context.living_situation}
                      onChange={(e) => setRiskAssessment({
                        ...riskAssessment,
                        context: { ...riskAssessment.context, living_situation: e.target.value }
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe support network (family, friends, services)..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RATING TAB */}
          {activeTab === 'rating' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Risk Rating Matrix</h3>
                  <p className="text-sm text-gray-600 mt-1">Assess likelihood and impact for each risk</p>
                </div>
                <button
                  onClick={addRisk}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  + Add Risk
                </button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="grid grid-cols-6 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                    <div>RISK DESCRIPTION</div>
                    <div>CATEGORY</div>
                    <div>LIKELIHOOD</div>
                    <div>IMPACT</div>
                    <div>RISK RATING</div>
                    <div>ACTION</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {riskAssessment.risks.map((risk, index) => (
                    <div key={index} className="px-4 py-4">
                      <div className="grid grid-cols-6 gap-4 items-center">
                        <div>
                          <textarea
                            value={risk.description}
                            onChange={(e) => updateRisk(index, 'description', e.target.value)}
                            rows={2}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                            placeholder="Describe the risk..."
                          />
                        </div>
                        
                        <div>
                          <select
                            value={risk.category}
                            onChange={(e) => updateRisk(index, 'category', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Category</option>
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
                          <select
                            value={risk.likelihood}
                            onChange={(e) => updateRisk(index, 'likelihood', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Likelihood</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        
                        <div>
                          <select
                            value={risk.impact}
                            onChange={(e) => updateRisk(index, 'impact', e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Impact</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>
                        
                        <div>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded w-full text-center ${
                            risk.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                            risk.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {risk.riskLevel}
                          </span>
                        </div>
                        
                        <div>
                          <button
                            onClick={() => removeRisk(index)}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {riskAssessment.risks.length === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500">
                      No risks added yet. Click "Add Risk" to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MGT TAB */}
          {activeTab === 'mgt' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Management</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Procedures</label>
                    <textarea
                      value={riskAssessment.emergency_procedures}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, emergency_procedures: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Detail emergency response procedures..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Staff Training Needs</label>
                    <textarea
                      value={riskAssessment.staff_training_needs}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, staff_training_needs: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="What training do staff need?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Requirements</label>
                    <textarea
                      value={riskAssessment.equipment_requirements}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, equipment_requirements: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Special equipment needed..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Environmental Modifications</label>
                    <textarea
                      value={riskAssessment.environmental_modifications}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, environmental_modifications: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Required environmental changes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MONITORING TAB */}
          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Monitoring</h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Monitoring Requirements</label>
                    <textarea
                      value={riskAssessment.monitoring_requirements}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, monitoring_requirements: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="What monitoring is required?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Schedule</label>
                    <select
                      value={riskAssessment.review_schedule}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, review_schedule: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Fortnightly">Fortnightly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="As Needed">As Needed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication Plan</label>
                    <textarea
                      value={riskAssessment.communication_plan}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, communication_plan: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="How will risks be communicated?"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Family Involvement</label>
                    <textarea
                      value={riskAssessment.family_involvement}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, family_involvement: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="How are family members involved?"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MITIGATION TAB */}
          {activeTab === 'mitigation' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Mitigation Details</h3>
              <div className="space-y-6">
                {riskAssessment.risks.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">{risk.description || `Risk ${index + 1}`}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        risk.riskLevel === 'high' ? 'bg-red-100 text-red-800' :
                        risk.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {risk.riskLevel} Risk
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Strategy</label>
                        <textarea
                          value={risk.mitigation}
                          onChange={(e) => updateRisk(index, 'mitigation', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="How will this risk be mitigated?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
                        <input
                          type="text"
                          value={risk.responsiblePerson}
                          onChange={(e) => updateRisk(index, 'responsiblePerson', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Who is responsible?"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {riskAssessment.risks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No risks to mitigate. Add risks in the Risk Rating tab first.
                  </div>
                )}

                <div className="border-t pt-6 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                      value={riskAssessment.notes}
                      onChange={(e) => setRiskAssessment({ ...riskAssessment, notes: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional notes or considerations..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
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
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : `Save ${isVersionMode ? 'Draft' : 'Assessment'}`}
        </button>

        {isVersionMode && versionData?.status === 'draft' && (
          <>
            <button
              onClick={handlePublishVersion}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Check size={18} />
              Publish Version
            </button>
            <button
              onClick={handleDiscardDraft}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <X size={18} />
              Discard Draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}