// frontend/src/pages/care-workflow/CarePlanEditor.tsx - COMPLETE WITH VERSIONING SUPPORT
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, FileText, Check, X, AlertCircle } from 'lucide-react';

interface Goal {
  description: string;
  target: string;
  timeframe: string;
}

interface Support {
  type: string;
  frequency: string;
  duration: string;
  provider: string;
}

interface CarePlanData {
  id?: number;
  participant_id?: number;
  plan_name: string;
  plan_version: string;
  plan_period: string;
  start_date: string;
  end_date: string;
  summary: string;
  participant_strengths: string;
  participant_preferences: string;
  family_goals: string;
  short_goals: Goal[];
  long_goals: Goal[];
  supports: Support[];
  monitoring: {
    frequency: string;
    methods: string;
    responsibilities: string;
  };
  risk_considerations: string;
  emergency_contacts: string;
  cultural_considerations: string;
  communication_preferences: string;
  status?: string;
  version_number?: string;
}

export default function CarePlanEditor() {
  const { participantId, versionId } = useParams();
  const navigate = useNavigate();
  const [participant, setParticipant] = useState<any>(null);
  const [carePlan, setCarePlan] = useState<CarePlanData>({
    plan_name: '',
    plan_version: '1.0',
    plan_period: '12 months',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    summary: '',
    participant_strengths: '',
    participant_preferences: '',
    family_goals: '',
    short_goals: [],
    long_goals: [],
    supports: [],
    monitoring: {
      frequency: 'Weekly',
      methods: '',
      responsibilities: ''
    },
    risk_considerations: '',
    emergency_contacts: '',
    cultural_considerations: '',
    communication_preferences: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    participant: true,
    goals: true,
    supports: true,
    monitoring: true,
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
        const vRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`);
        if (vRes.ok) {
          const vData = await vRes.json();
          setVersionData(vData);
          setCarePlan({
            ...vData,
            short_goals: vData.short_goals || [],
            long_goals: vData.long_goals || [],
            supports: vData.supports || [],
            monitoring: vData.monitoring || { frequency: 'Weekly', methods: '', responsibilities: '' }
          });
        }
      } else {
        // Regular editing mode - load current care plan
        try {
          const cpRes = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`);
          if (cpRes.ok) {
            const cpData = await cpRes.json();
            setCarePlan({
              ...cpData,
              short_goals: cpData.short_goals || [],
              long_goals: cpData.long_goals || [],
              supports: cpData.supports || [],
              monitoring: cpData.monitoring || { frequency: 'Weekly', methods: '', responsibilities: '' }
            });
          }
        } catch (e) {
          console.log('No existing care plan, creating new');
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
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`;
        method = 'PUT';
        body = JSON.stringify(carePlan);
      } else {
        // Save regular care plan
        endpoint = `${API_BASE_URL}/care/participants/${participantId}/care-plan`;
        method = carePlan.id ? 'PUT' : 'POST';
        body = JSON.stringify(carePlan);
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        alert('Care plan saved successfully');
        if (!isVersionMode) {
          navigate(`/participants/${participantId}`);
        }
      } else {
        alert('Failed to save care plan');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving care plan');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishVersion = async () => {
    if (!confirm('Publish this version as current? This will archive the previous current version.')) return;
    
    setSaving(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}/publish`,
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
        `${API_BASE_URL}/care/participants/${participantId}/care-plan/versions/${versionId}`,
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

  // Goal management
  const addShortGoal = () => {
    setCarePlan({
      ...carePlan,
      short_goals: [...carePlan.short_goals, { description: '', target: '', timeframe: '3 months' }]
    });
  };

  const updateShortGoal = (index: number, field: keyof Goal, value: string) => {
    const updated = [...carePlan.short_goals];
    updated[index] = { ...updated[index], [field]: value };
    setCarePlan({ ...carePlan, short_goals: updated });
  };

  const removeShortGoal = (index: number) => {
    setCarePlan({
      ...carePlan,
      short_goals: carePlan.short_goals.filter((_, i) => i !== index)
    });
  };

  const addLongGoal = () => {
    setCarePlan({
      ...carePlan,
      long_goals: [...carePlan.long_goals, { description: '', target: '', timeframe: '12 months' }]
    });
  };

  const updateLongGoal = (index: number, field: keyof Goal, value: string) => {
    const updated = [...carePlan.long_goals];
    updated[index] = { ...updated[index], [field]: value };
    setCarePlan({ ...carePlan, long_goals: updated });
  };

  const removeLongGoal = (index: number) => {
    setCarePlan({
      ...carePlan,
      long_goals: carePlan.long_goals.filter((_, i) => i !== index)
    });
  };

  // Support management
  const addSupport = () => {
    setCarePlan({
      ...carePlan,
      supports: [...carePlan.supports, { type: '', frequency: '', duration: '', provider: '' }]
    });
  };

  const updateSupport = (index: number, field: keyof Support, value: string) => {
    const updated = [...carePlan.supports];
    updated[index] = { ...updated[index], [field]: value };
    setCarePlan({ ...carePlan, supports: updated });
  };

  const removeSupport = (index: number) => {
    setCarePlan({
      ...carePlan,
      supports: carePlan.supports.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <FileText className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {isVersionMode ? `Edit Care Plan v${versionData?.version_number}` : 'Edit Care Plan'}
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
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

      {/* Plan Overview Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Plan Overview</h2>
          {expandedSections.overview ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.overview && (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input
                  type="text"
                  value={carePlan.plan_name}
                  onChange={(e) => setCarePlan({ ...carePlan, plan_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Care Plan for John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Period</label>
                <input
                  type="text"
                  value={carePlan.plan_period}
                  onChange={(e) => setCarePlan({ ...carePlan, plan_period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 12 months"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={carePlan.start_date}
                  onChange={(e) => setCarePlan({ ...carePlan, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={carePlan.end_date}
                  onChange={(e) => setCarePlan({ ...carePlan, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
              <textarea
                value={carePlan.summary}
                onChange={(e) => setCarePlan({ ...carePlan, summary: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Provide a brief overview of the care plan..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Participant Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('participant')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Participant Information</h2>
          {expandedSections.participant ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.participant && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Participant Strengths</label>
              <textarea
                value={carePlan.participant_strengths}
                onChange={(e) => setCarePlan({ ...carePlan, participant_strengths: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="List the participant's key strengths..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Participant Preferences</label>
              <textarea
                value={carePlan.participant_preferences}
                onChange={(e) => setCarePlan({ ...carePlan, participant_preferences: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document the participant's preferences..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Family Goals</label>
              <textarea
                value={carePlan.family_goals}
                onChange={(e) => setCarePlan({ ...carePlan, family_goals: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document family goals and aspirations..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Goals Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('goals')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Goals</h2>
          {expandedSections.goals ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.goals && (
          <div className="px-6 pb-6 space-y-6">
            {/* Short-term Goals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900">Short-term Goals (0-6 months)</h3>
                <button
                  onClick={addShortGoal}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Plus size={16} /> Add Goal
                </button>
              </div>

              <div className="space-y-3">
                {carePlan.short_goals.map((goal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Goal {index + 1}</span>
                      <button
                        onClick={() => removeShortGoal(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                          value={goal.description}
                          onChange={(e) => updateShortGoal(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="What does the participant want to achieve?"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Target/Measure</label>
                          <input
                            type="text"
                            value={goal.target}
                            onChange={(e) => updateShortGoal(index, 'target', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="How will success be measured?"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Timeframe</label>
                          <input
                            type="text"
                            value={goal.timeframe}
                            onChange={(e) => updateShortGoal(index, 'timeframe', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 3 months"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {carePlan.short_goals.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No short-term goals added yet</p>
                )}
              </div>
            </div>

            {/* Long-term Goals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-medium text-gray-900">Long-term Goals (6+ months)</h3>
                <button
                  onClick={addLongGoal}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <Plus size={16} /> Add Goal
                </button>
              </div>

              <div className="space-y-3">
                {carePlan.long_goals.map((goal, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Goal {index + 1}</span>
                      <button
                        onClick={() => removeLongGoal(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                          value={goal.description}
                          onChange={(e) => updateLongGoal(index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="What does the participant want to achieve?"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Target/Measure</label>
                          <input
                            type="text"
                            value={goal.target}
                            onChange={(e) => updateLongGoal(index, 'target', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="How will success be measured?"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Timeframe</label>
                          <input
                            type="text"
                            value={goal.timeframe}
                            onChange={(e) => updateLongGoal(index, 'timeframe', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., 12 months"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {carePlan.long_goals.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No long-term goals added yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supports Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('supports')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Supports & Services</h2>
          {expandedSections.supports ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.supports && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">Define the supports and services required</p>
              <button
                onClick={addSupport}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
              >
                <Plus size={16} /> Add Support
              </button>
            </div>

            <div className="space-y-3">
              {carePlan.supports.map((support, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Support {index + 1}</span>
                    <button
                      onClick={() => removeSupport(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Support Type</label>
                      <input
                        type="text"
                        value={support.type}
                        onChange={(e) => updateSupport(index, 'type', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Personal Care, Therapy"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Provider</label>
                      <input
                        type="text"
                        value={support.provider}
                        onChange={(e) => updateSupport(index, 'provider', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Provider name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                      <input
                        type="text"
                        value={support.frequency}
                        onChange={(e) => updateSupport(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Daily, Weekly"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                      <input
                        type="text"
                        value={support.duration}
                        onChange={(e) => updateSupport(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2 hours"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {carePlan.supports.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No supports added yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Monitoring Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('monitoring')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Monitoring & Review</h2>
          {expandedSections.monitoring ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.monitoring && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Frequency</label>
              <input
                type="text"
                value={carePlan.monitoring.frequency}
                onChange={(e) => setCarePlan({
                  ...carePlan,
                  monitoring: { ...carePlan.monitoring, frequency: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Weekly, Monthly"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monitoring Methods</label>
              <textarea
                value={carePlan.monitoring.methods}
                onChange={(e) => setCarePlan({
                  ...carePlan,
                  monitoring: { ...carePlan.monitoring, methods: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Describe how progress will be monitored..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
              <textarea
                value={carePlan.monitoring.responsibilities}
                onChange={(e) => setCarePlan({
                  ...carePlan,
                  monitoring: { ...carePlan.monitoring, responsibilities: e.target.value }
                })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Who is responsible for monitoring and review?"
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Considerations Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => toggleSection('additional')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Additional Considerations</h2>
          {expandedSections.additional ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expandedSections.additional && (
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Considerations</label>
              <textarea
                value={carePlan.risk_considerations}
                onChange={(e) => setCarePlan({ ...carePlan, risk_considerations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Document any risk considerations..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contacts</label>
              <textarea
                value={carePlan.emergency_contacts}
                onChange={(e) => setCarePlan({ ...carePlan, emergency_contacts: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="List emergency contact details..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cultural Considerations</label>
              <textarea
                value={carePlan.cultural_considerations}
                onChange={(e) => setCarePlan({ ...carePlan, cultural_considerations: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Document cultural needs and preferences..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Communication Preferences</label>
              <textarea
                value={carePlan.communication_preferences}
                onChange={(e) => setCarePlan({ ...carePlan, communication_preferences: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="How does the participant prefer to communicate?"
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
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? 'Saving...' : `Save ${isVersionMode ? 'Draft' : 'Care Plan'}`}
        </button>
      </div>
    </div>
  );
}