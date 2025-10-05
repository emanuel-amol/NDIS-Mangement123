// frontend/src/pages/care-workflow/CarePlanEditor.tsx - COMPLETE VERSION
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Home, FileText, Calendar, Target, Activity, Users, Monitor } from "lucide-react";
import { DynamicSelect } from "../../components/DynamicSelect";

type Support = { 
  type: string; 
  customType?: string;
  frequency: string; 
  duration?: string;
  location?: string;
  staffRatio?: string;
  notes?: string;
  cost?: string;
  provider?: string;
};

type Goal = { 
  category: string;
  text: string; 
  timeframe: string;
  measurementMethod: string;
  targetOutcome: string;
  currentStatus?: string;
  notes?: string;
};

type CarePlan = {
  id?: string;
  participant_id: string;
  plan_name?: string;
  plan_version?: string;
  plan_period?: string;
  start_date?: string;
  end_date?: string;
  summary?: string;
  participant_strengths?: string;
  participant_preferences?: string;
  family_goals?: string;
  short_goals: Goal[];
  long_goals: Goal[];
  supports: Support[];
  monitoring: { 
    progress_measures?: string; 
    review_cadence?: string;
    reporting_requirements?: string;
    key_contacts?: string;
  };
  risk_considerations?: string;
  emergency_contacts?: string;
  cultural_considerations?: string;
  communication_preferences?: string;
  status?: "draft" | "complete" | "approved";
};

export default function CarePlanEditor() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [cp, setCp] = useState<CarePlan>({
    participant_id: participantId!,
    plan_name: "",
    plan_version: "1.0",
    plan_period: "12 months",
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0],
    summary: "",
    participant_strengths: "",
    participant_preferences: "",
    family_goals: "",
    short_goals: [{ 
      category: "", 
      text: "", 
      timeframe: "3-6 months", 
      measurementMethod: "",
      targetOutcome: "",
      currentStatus: "not_started",
      notes: ""
    }],
    long_goals: [{ 
      category: "", 
      text: "", 
      timeframe: "6-12 months", 
      measurementMethod: "",
      targetOutcome: "",
      currentStatus: "not_started",
      notes: ""
    }],
    supports: [{ 
      type: "", 
      frequency: "Weekly", 
      duration: "1 hour",
      location: "Home",
      staffRatio: "1:1 (One-on-one)",
      notes: "",
      cost: "",
      provider: ""
    }],
    monitoring: { 
      progress_measures: "", 
      review_cadence: "Monthly",
      reporting_requirements: "",
      key_contacts: ""
    },
    risk_considerations: "",
    emergency_contacts: "",
    cultural_considerations: "",
    communication_preferences: "",
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participantName, setParticipantName] = useState("Sample Participant");

  useEffect(() => {
    const fetchParticipantData = async () => {
      if (!participantId) return;
      
      try {
        setLoading(true);
        
        const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
        const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
        
        if (response.ok) {
          const participantData = await response.json();
          setParticipantName(`${participantData.first_name} ${participantData.last_name}`);
          
          // Set plan name based on participant
          setCp(prevCp => ({
            ...prevCp,
            plan_name: `Care Plan for ${participantData.first_name} ${participantData.last_name}`
          }));
          
          // Try to fetch existing care plan
          try {
            const carePlanResponse = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`);
            if (carePlanResponse.ok) {
              const existingCarePlan = await carePlanResponse.json();
              setCp(prevCp => ({
                ...prevCp,
                ...existingCarePlan,
                participant_id: participantId
              }));
            }
          } catch (carePlanError) {
            console.log('No existing care plan found, starting with blank form');
          }
        } else {
          console.error('Failed to fetch participant data');
          setParticipantName('Unknown Participant');
        }
      } catch (error) {
        console.error('Error fetching participant data:', error);
        setParticipantName('Unknown Participant');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantData();
  }, [participantId]);

  const save = async () => {
    if (!cp.summary) {
      alert("Summary is required");
      return;
    }
    setSaving(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
      
      const carePlanData = {
        plan_name: cp.plan_name || `Care Plan for ${participantName}`,
        plan_version: cp.plan_version || "1.0",
        plan_period: cp.plan_period || "12 months",
        start_date: cp.start_date,
        end_date: cp.end_date,
        summary: cp.summary,
        participant_strengths: cp.participant_strengths,
        participant_preferences: cp.participant_preferences,
        family_goals: cp.family_goals,
        short_goals: cp.short_goals,
        long_goals: cp.long_goals,
        supports: cp.supports,
        monitoring: cp.monitoring,
        risk_considerations: cp.risk_considerations,
        emergency_contacts: cp.emergency_contacts,
        cultural_considerations: cp.cultural_considerations,
        communication_preferences: cp.communication_preferences,
        status: cp.status || "draft"
      };

      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(carePlanData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Care plan saved successfully:', result);
        alert('Care plan saved successfully!');
        navigate(`/care/setup/${participantId}`);
      } else {
        const errorData = await response.json();
        console.error('Failed to save care plan:', errorData);
        alert(`Failed to save care plan: ${errorData.detail || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving care plan:', error);
      alert('Network error occurred while saving care plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateArray = <K extends keyof CarePlan>(key: K, index: number, value: any) => {
    const arr = [...(cp[key] as any[])];
    arr[index] = value;
    setCp({ ...cp, [key]: arr });
  };

  const addRow = <K extends keyof CarePlan>(key: K) => {
    const arr = [...(cp[key] as any[])];
    if (key === "supports") {
      arr.push({ 
        type: "", 
        frequency: "Weekly", 
        duration: "1 hour",
        location: "Home",
        staffRatio: "1:1 (One-on-one)",
        notes: "",
        cost: "",
        provider: ""
      });
    } else if (key === "short_goals") {
      arr.push({ 
        category: "", 
        text: "", 
        timeframe: "3-6 months", 
        measurementMethod: "",
        targetOutcome: "",
        currentStatus: "not_started",
        notes: ""
      });
    } else {
      arr.push({ 
        category: "", 
        text: "", 
        timeframe: "6-12 months", 
        measurementMethod: "",
        targetOutcome: "",
        currentStatus: "not_started",
        notes: ""
      });
    }
    setCp({ ...cp, [key]: arr });
  };

  const removeRow = <K extends keyof CarePlan>(key: K, index: number) => {
    const arr = [...(cp[key] as any[])];
    if (arr.length > 1) {
      arr.splice(index, 1);
      setCp({ ...cp, [key]: arr });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading care plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <ArrowLeft size={16} />
                Back
              </button>
              <div className="border-l border-gray-300 h-6"></div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Care Plan Editor</h1>
                <p className="text-sm text-gray-600">Creating care plan for {participantName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                <Home size={16} />
                Dashboard
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Care Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Overview Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Plan Overview</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Period
                </label>
                <DynamicSelect
                  dataType="plan_periods"
                  value={cp.plan_period ?? ""}
                  onChange={value => setCp({ ...cp, plan_period: value })}
                  placeholder="Select plan period"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={cp.start_date ?? ""}
                  onChange={e => setCp({ ...cp, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={cp.end_date ?? ""}
                  onChange={e => setCp({ ...cp, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan Summary <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cp.summary ?? ""}
                onChange={e => setCp({ ...cp, summary: e.target.value })}
                placeholder="Provide a comprehensive summary of the participant's care needs and overall plan objectives..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant Strengths
                </label>
                <textarea
                  value={cp.participant_strengths ?? ""}
                  onChange={e => setCp({ ...cp, participant_strengths: e.target.value })}
                  placeholder="List the participant's key strengths, abilities, and positive attributes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participant Preferences
                </label>
                <textarea
                  value={cp.participant_preferences ?? ""}
                  onChange={e => setCp({ ...cp, participant_preferences: e.target.value })}
                  placeholder="Document the participant's preferences for support delivery, activities, etc..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family Goals
              </label>
              <textarea
                value={cp.family_goals ?? ""}
                onChange={e => setCp({ ...cp, family_goals: e.target.value })}
                placeholder="Document any goals or outcomes that family/carers want to achieve..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Goals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Goals & Outcomes</h2>
            </div>
            
            {/* Short-term Goals */}
            <div className="mb-8">
              <h3 className="text-md font-medium text-gray-800 mb-4">Short-term Goals (3-6 months)</h3>
              {cp.short_goals.map((goal, i) => (
                <div key={`sg-${i}`} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goal Category</label>
                      <DynamicSelect
                        dataType="goal_categories"
                        value={goal.category}
                        onChange={value => updateArray("short_goals", i, { ...goal, category: value })}
                        placeholder="Select goal category"
                        includeOther={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                      <DynamicSelect
                        dataType="goal_timeframes"
                        value={goal.timeframe}
                        onChange={value => updateArray("short_goals", i, { ...goal, timeframe: value })}
                        placeholder="Select timeframe"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Goal Description</label>
                    <textarea
                      value={goal.text}
                      onChange={e => updateArray("short_goals", i, { ...goal, text: e.target.value })}
                      placeholder="Enter specific, measurable goal..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Method</label>
                      <input
                        type="text"
                        value={goal.measurementMethod}
                        onChange={e => updateArray("short_goals", i, { ...goal, measurementMethod: e.target.value })}
                        placeholder="How will progress be measured?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Outcome</label>
                      <input
                        type="text"
                        value={goal.targetOutcome}
                        onChange={e => updateArray("short_goals", i, { ...goal, targetOutcome: e.target.value })}
                        placeholder="What is the desired outcome?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => addRow("short_goals")}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Goal
                    </button>
                    {cp.short_goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow("short_goals", i)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Long-term Goals */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-4">Long-term Goals (6+ months)</h3>
              {cp.long_goals.map((goal, i) => (
                <div key={`lg-${i}`} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Goal Category</label>
                      <DynamicSelect
                        dataType="goal_categories"
                        value={goal.category}
                        onChange={value => updateArray("long_goals", i, { ...goal, category: value })}
                        placeholder="Select goal category"
                        includeOther={true}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                      <DynamicSelect
                        dataType="goal_timeframes"
                        value={goal.timeframe}
                        onChange={value => updateArray("long_goals", i, { ...goal, timeframe: value })}
                        placeholder="Select timeframe"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Goal Description</label>
                    <textarea
                      value={goal.text}
                      onChange={e => updateArray("long_goals", i, { ...goal, text: e.target.value })}
                      placeholder="Enter specific, measurable long-term goal..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Method</label>
                      <input
                        type="text"
                        value={goal.measurementMethod}
                        onChange={e => updateArray("long_goals", i, { ...goal, measurementMethod: e.target.value })}
                        placeholder="How will progress be measured?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Outcome</label>
                      <input
                        type="text"
                        value={goal.targetOutcome}
                        onChange={e => updateArray("long_goals", i, { ...goal, targetOutcome: e.target.value })}
                        placeholder="What is the desired outcome?"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => addRow("long_goals")}
                      className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add Goal
                    </button>
                    {cp.long_goals.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow("long_goals", i)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                      >
                        <Trash2 size={16} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supports & Services Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Supports & Services</h2>
            </div>
            
            {cp.supports.map((support, i) => (
              <div key={`support-${i}`} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Type</label>
                    <DynamicSelect
                      dataType="service_types"
                      value={support.type}
                      onChange={value => updateArray("supports", i, { ...support, type: value })}
                      placeholder="Select support type"
                      includeOther={true}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <DynamicSelect
                      dataType="support_frequencies"
                      value={support.frequency}
                      onChange={value => updateArray("supports", i, { ...support, frequency: value })}
                      placeholder="Select frequency"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                    <DynamicSelect
                      dataType="support_durations"
                      value={support.duration ?? ""}
                      onChange={value => updateArray("supports", i, { ...support, duration: value })}
                      placeholder="Select duration"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <DynamicSelect
                      dataType="support_locations"
                      value={support.location ?? ""}
                      onChange={value => updateArray("supports", i, { ...support, location: value })}
                      placeholder="Select location"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Ratio</label>
                    <DynamicSelect
                      dataType="staff_ratios"
                      value={support.staffRatio ?? ""}
                      onChange={value => updateArray("supports", i, { ...support, staffRatio: value })}
                      placeholder="Select staff ratio"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Notes</label>
                  <textarea
                    value={support.notes ?? ""}
                    onChange={e => updateArray("supports", i, { ...support, notes: e.target.value })}
                    placeholder="Additional notes about this support..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => addRow("supports")}
                    className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Support
                  </button>
                  {cp.supports.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow("supports", i)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-1"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Monitoring & Review Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-5 w-5 text-orange-600" />
              <h2 className="text-lg font-semibold text-gray-900">Monitoring & Review</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress Measures
                </label>
                <textarea
                  value={cp.monitoring.progress_measures ?? ""}
                  onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, progress_measures: e.target.value } })}
                  placeholder="How will progress towards goals be measured?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Cadence
                </label>
                <DynamicSelect
                  dataType="review_frequencies"
                  value={cp.monitoring.review_cadence ?? ""}
                  onChange={value => setCp({ ...cp, monitoring: { ...cp.monitoring, review_cadence: value } })}
                  placeholder="How often will this plan be reviewed?"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reporting Requirements
                </label>
                <textarea
                  value={cp.monitoring.reporting_requirements ?? ""}
                  onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, reporting_requirements: e.target.value } })}
                  placeholder="What reports are required and when?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Contacts
                </label>
                <textarea
                  value={cp.monitoring.key_contacts ?? ""}
                  onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, key_contacts: e.target.value } })}
                  placeholder="List key contacts for monitoring and reporting"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Additional Considerations Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Additional Considerations</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Risk Considerations
                </label>
                <textarea
                  value={cp.risk_considerations ?? ""}
                  onChange={e => setCp({ ...cp, risk_considerations: e.target.value })}
                  placeholder="Any risk factors to consider in care delivery"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Contacts
                </label>
                <textarea
                  value={cp.emergency_contacts ?? ""}
                  onChange={e => setCp({ ...cp, emergency_contacts: e.target.value })}
                  placeholder="Emergency contact information"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cultural Considerations
                </label>
                <textarea
                  value={cp.cultural_considerations ?? ""}
                  onChange={e => setCp({ ...cp, cultural_considerations: e.target.value })}
                  placeholder="Cultural, linguistic, or religious considerations"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Preferences
                </label>
                <textarea
                  value={cp.communication_preferences ?? ""}
                  onChange={e => setCp({ ...cp, communication_preferences: e.target.value })}
                  placeholder="Preferred methods and styles of communication"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={() => setCp({ ...cp, status: "draft" })}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Save as Draft
              </button>
              <button
                onClick={save}
                disabled={saving || !cp.summary}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <FileText size={16} />
                {saving ? 'Saving...' : 'Save Care Plan'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}