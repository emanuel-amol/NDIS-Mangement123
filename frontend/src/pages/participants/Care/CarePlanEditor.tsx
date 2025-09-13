// frontend/src/pages/participants/Care/CarePlanEditor.tsx - Working Version
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Home, FileText } from "lucide-react";

type Support = { type: string; frequency: string; notes?: string };
type Goal = { text: string; note?: string };

type CarePlan = {
  id?: string;
  participant_id: string;
  plan_period?: string;
  start_date?: string;
  summary?: string;
  short_goals: Goal[];
  long_goals: Goal[];
  supports: Support[];
  monitoring: { progress_measures?: string; review_cadence?: string };
  status?: "draft" | "complete";
};

export default function CarePlanEditor() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [cp, setCp] = useState<CarePlan>({
    participant_id: participantId!,
    plan_period: "12 months",
    start_date: new Date().toISOString().split('T')[0],
    summary: "",
    short_goals: [{ text: "", note: "" }],
    long_goals: [{ text: "", note: "" }],
    supports: [{ type: "", frequency: "Weekly", notes: "" }],
    monitoring: { progress_measures: "", review_cadence: "Monthly" },
    status: "draft",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participantName, setParticipantName] = useState("Sample Participant");

  useEffect(() => {
    // Get participant name from ID
    const getParticipantName = () => {
      if (participantId?.includes('1')) return 'Jordan Smith';
      if (participantId?.includes('2')) return 'Amrita Kumar';
      if (participantId?.includes('3')) return 'Linh Nguyen';
      return 'Sample Participant';
    };
    
    setParticipantName(getParticipantName());
    
    // In a real app, you'd load existing care plan data here
    // For demo purposes, we'll use the initial state
    setLoading(false);
  }, [participantId]);

  const save = async () => {
    if (!cp.summary) {
      alert("Summary is required");
      return;
    }
    setSaving(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Saving care plan:', cp);
      
      // In a real app, you'd make an API call here:
      // const response = await fetch('/api/care-plans', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(cp)
      // });
      
      alert('Care plan saved successfully!');
      navigate(`/care/signoff/${participantId}`);
    } catch (error) {
      console.error('Error saving care plan:', error);
      alert('Error saving care plan. Please try again.');
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
      arr.push({ type: "", frequency: "Weekly", notes: "" });
    } else {
      arr.push({ text: "", note: "" });
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
                onClick={() => navigate('/provider')}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plan Period
                </label>
                <input
                  type="text"
                  value={cp.plan_period ?? ""}
                  onChange={e => setCp({ ...cp, plan_period: e.target.value })}
                  placeholder="e.g., 12 months"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          </div>

          {/* Goals Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Goals</h2>
            
            {/* Short-term Goals */}
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-800 mb-3">Short-term Goals (3-6 months)</h3>
              {cp.short_goals.map((goal, i) => (
                <div key={`sg-${i}`} className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={goal.text}
                      onChange={e => updateArray("short_goals", i, { ...goal, text: e.target.value })}
                      placeholder="Enter short-term goal..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addRow("short_goals")}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    <Plus size={16} />
                  </button>
                  {cp.short_goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow("short_goals", i)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Long-term Goals */}
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-3">Long-term Goals (6-12 months)</h3>
              {cp.long_goals.map((goal, i) => (
                <div key={`lg-${i}`} className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={goal.text}
                      onChange={e => updateArray("long_goals", i, { ...goal, text: e.target.value })}
                      placeholder="Enter long-term goal..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => addRow("long_goals")}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                  >
                    <Plus size={16} />
                  </button>
                  {cp.long_goals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow("long_goals", i)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Supports & Services Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Supports & Services</h2>
            {cp.supports.map((support, i) => (
              <div key={`sp-${i}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Support Type</label>
                  <input
                    type="text"
                    value={support.type}
                    onChange={e => updateArray("supports", i, { ...support, type: e.target.value })}
                    placeholder="e.g., Personal Care, Daily Living Skills"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={support.frequency}
                    onChange={e => updateArray("supports", i, { ...support, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Fortnightly">Fortnightly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="As needed">As needed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={support.notes ?? ""}
                    onChange={e => updateArray("supports", i, { ...support, notes: e.target.value })}
                    placeholder="Additional details..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="md:col-span-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => addRow("supports")}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Support
                  </button>
                  {cp.supports.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow("supports", i)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Monitoring Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Monitoring & Review</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress Measures
                </label>
                <textarea
                  value={cp.monitoring.progress_measures ?? ""}
                  onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, progress_measures: e.target.value } })}
                  placeholder="How will progress be measured and documented?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Cadence
                </label>
                <select
                  value={cp.monitoring.review_cadence ?? "Monthly"}
                  onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, review_cadence: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Fortnightly">Fortnightly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
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