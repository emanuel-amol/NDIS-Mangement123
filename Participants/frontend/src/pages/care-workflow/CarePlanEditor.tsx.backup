// frontend/src/pages/care-workflow/CarePlanEditor.tsx - TABBED WITH FULL FEATURES
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Plus, Trash2, Heart, Calendar, Target, Users, Monitor, Activity } from 'lucide-react';
import { DynamicSelect } from "../../components/DynamicSelect";
import { dynamicDataAPI } from "../../services/api";

type PricingInfo = { rate?: number; unit?: string; label?: string; serviceCode?: string };

const formatPricing = (p?: PricingInfo) => {
  if (p && typeof p.rate === "number" && p.unit) {
    return `${Number(p.rate).toFixed(2)}/${p.unit}`;
  }
  return "";
};

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
  const [activeTab, setActiveTab] = useState('overview');
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
  const [pricingMap, setPricingMap] = useState<Record<string, PricingInfo>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [participantName, setParticipantName] = useState("Sample Participant");

  const tabs = [
    { id: 'overview', label: 'Plan Overview', icon: Calendar },
    { id: 'participant', label: 'Participant Info', icon: Heart },
    { id: 'goals', label: 'Goals & Outcomes', icon: Target },
    { id: 'supports', label: 'Supports & Services', icon: Users },
    { id: 'monitoring', label: 'Monitoring & Review', icon: Monitor },
    { id: 'additional', label: 'Additional Info', icon: Activity }
  ];

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const items = await dynamicDataAPI.getByType("pricing_items");
        if (!alive) return;

        const map: Record<string, PricingInfo> = {};
        items.forEach((item: any) => {
          const meta = item?.meta ?? {};
          const rawRate = meta.rate ?? meta.price ?? meta.unit_rate ?? meta.unitRate;
          const parsedRate =
            typeof rawRate === "number" ? rawRate : rawRate ? parseFloat(rawRate) : undefined;
          const rate = Number.isFinite(parsedRate) ? parsedRate : undefined;
          const unit = meta.unit ?? meta.billing_unit ?? meta.unit_of_measure ?? meta.billingUnit;

          map[item.code] = {
            label: item.label,
            serviceCode: meta.service_code ?? meta.serviceCode,
            rate,
            unit,
          };
        });

        setPricingMap(map);
      } catch (error) {
        console.error("Failed to load pricing items", error);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const fetchParticipantData = async () => {
      if (!participantId) return;
      
      try {
        setLoading(true);
        const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1') as string;
        const response = await fetch(`${API_BASE_URL}/participants/${participantId}`);
        
        if (response.ok) {
          const participantData = await response.json();
          setParticipantName(`${participantData.first_name} ${participantData.last_name}`);
          
          setCp(prevCp => ({
            ...prevCp,
            plan_name: `Care Plan for ${participantData.first_name} ${participantData.last_name}`
          }));
          
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
        }
      } catch (error) {
        console.error('Error fetching participant data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantData();
  }, [participantId]);

  useEffect(() => {
    if (!cp.supports?.length) return;
    if (!Object.keys(pricingMap).length) return;

    const needsUpdate = cp.supports.some(support => {
      const formatted = formatPricing(pricingMap[support.type]);
      return formatted !== (support.cost ?? "");
    });

    if (!needsUpdate) return;

    setCp(prev => {
      if (!prev.supports?.length) return prev;
      const nextSupports = prev.supports.map(support => {
        const formatted = formatPricing(pricingMap[support.type]);
        return { ...support, cost: formatted };
      });
      return { ...prev, supports: nextSupports };
    });
  }, [pricingMap, cp.supports]);

  const save = async () => {
    if (!cp.summary) {
      alert("Summary is required");
      return;
    }
    setSaving(true);

    try {
      const supportsWithAdminPrice = (cp.supports || []).map(support => {
        const pricing = support.type ? pricingMap[support.type] : undefined;
        return { ...support, cost: formatPricing(pricing) };
      });
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1') as string;
      
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
        supports: supportsWithAdminPrice,
        monitoring: cp.monitoring,
        risk_considerations: cp.risk_considerations,
        emergency_contacts: cp.emergency_contacts,
        cultural_considerations: cp.cultural_considerations,
        communication_preferences: cp.communication_preferences,
        status: cp.status || "draft"
      };

      const response = await fetch(`${API_BASE_URL}/care/participants/${participantId}/care-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carePlanData),
      });

      if (response.ok) {
        alert('Care plan saved successfully!');
        navigate(`/care/setup/${participantId}`);
      } else {
        const errorData = await response.json();
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

  const handlePricingChange = (index: number, code: string) => {
    const current = cp.supports[index];
    if (!current) return;

    const pricing = code ? pricingMap[code] : undefined;
    const cost = formatPricing(pricing);

    updateArray('supports', index, { ...current, type: code, cost });
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
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Care Plan Editor</h1>
                <p className="text-sm text-gray-600">{participantName}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 border-b overflow-x-auto">
            <div className="flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'text-gray-900 border-gray-900'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Plan Period</label>
                    <DynamicSelect
                      dataType="plan_periods"
                      value={cp.plan_period ?? ""}
                      onChange={value => setCp({ ...cp, plan_period: value })}
                      placeholder="Select plan period"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input type="date" value={cp.start_date ?? ""} 
                      onChange={e => setCp({ ...cp, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input type="date" value={cp.end_date ?? ""}
                      onChange={e => setCp({ ...cp, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan Summary *</label>
                  <textarea value={cp.summary ?? ""}
                    onChange={e => setCp({ ...cp, summary: e.target.value })}
                    rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Provide a comprehensive summary..."></textarea>
                </div>
              </div>
            )}

            {/* PARTICIPANT TAB */}
            {activeTab === 'participant' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participant Strengths</label>
                    <textarea value={cp.participant_strengths ?? ""}
                      onChange={e => setCp({ ...cp, participant_strengths: e.target.value })}
                      rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Participant Preferences</label>
                    <textarea value={cp.participant_preferences ?? ""}
                      onChange={e => setCp({ ...cp, participant_preferences: e.target.value })}
                      rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Family Goals</label>
                  <textarea value={cp.family_goals ?? ""}
                    onChange={e => setCp({ ...cp, family_goals: e.target.value })}
                    rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
              </div>
            )}

            {/* GOALS TAB */}
            {activeTab === 'goals' && (
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Short-term Goals (3-6 months)</h3>
                    <button onClick={() => addRow('short_goals')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                      <Plus size={16} /> Add Goal
                    </button>
                  </div>
                  {cp.short_goals.map((goal, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Category</label>
                          <DynamicSelect dataType="goal_categories" value={goal.category}
                            onChange={value => updateArray('short_goals', i, { ...goal, category: value })}
                            placeholder="Select category" includeOther={true} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                          <DynamicSelect dataType="goal_timeframes" value={goal.timeframe}
                            onChange={value => updateArray('short_goals', i, { ...goal, timeframe: value })}
                            placeholder="Select timeframe" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Description</label>
                        <textarea value={goal.text}
                          onChange={e => updateArray('short_goals', i, { ...goal, text: e.target.value })}
                          rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Method</label>
                          <input type="text" value={goal.measurementMethod}
                            onChange={e => updateArray('short_goals', i, { ...goal, measurementMethod: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target Outcome</label>
                          <input type="text" value={goal.targetOutcome}
                            onChange={e => updateArray('short_goals', i, { ...goal, targetOutcome: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      {cp.short_goals.length > 1 && (
                        <button onClick={() => removeRow('short_goals', i)}
                          className="mt-3 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm flex items-center gap-1">
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">Long-term Goals (6+ months)</h3>
                    <button onClick={() => addRow('long_goals')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                      <Plus size={16} /> Add Goal
                    </button>
                  </div>
                  {cp.long_goals.map((goal, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Category</label>
                          <DynamicSelect dataType="goal_categories" value={goal.category}
                            onChange={value => updateArray('long_goals', i, { ...goal, category: value })}
                            placeholder="Select category" includeOther={true} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe</label>
                          <DynamicSelect dataType="goal_timeframes" value={goal.timeframe}
                            onChange={value => updateArray('long_goals', i, { ...goal, timeframe: value })}
                            placeholder="Select timeframe" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Goal Description</label>
                        <textarea value={goal.text}
                          onChange={e => updateArray('long_goals', i, { ...goal, text: e.target.value })}
                          rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Method</label>
                          <input type="text" value={goal.measurementMethod}
                            onChange={e => updateArray('long_goals', i, { ...goal, measurementMethod: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Target Outcome</label>
                          <input type="text" value={goal.targetOutcome}
                            onChange={e => updateArray('long_goals', i, { ...goal, targetOutcome: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                      {cp.long_goals.length > 1 && (
                        <button onClick={() => removeRow('long_goals', i)}
                          className="mt-3 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm flex items-center gap-1">
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUPPORTS TAB */}
            {activeTab === 'supports' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Support Services</h3>
                  <button onClick={() => addRow('supports')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                    <Plus size={16} /> Add Support
                  </button>
                </div>
                {cp.supports.map((support, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Support Type</label>
                        <DynamicSelect dataType="pricing_items" value={support.type}
                          onChange={code => handlePricingChange(i, code)}
                          placeholder="Select pricing item" includeOther={false} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                        <DynamicSelect dataType="support_frequencies" value={support.frequency}
                          onChange={value => updateArray('supports', i, { ...support, frequency: value })}
                          placeholder="Select frequency" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                        <DynamicSelect dataType="support_durations" value={support.duration ?? ""}
                          onChange={value => updateArray('supports', i, { ...support, duration: value })}
                          placeholder="Select duration" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <DynamicSelect dataType="support_locations" value={support.location ?? ""}
                          onChange={value => updateArray('supports', i, { ...support, location: value })}
                          placeholder="Select location" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Staff Ratio</label>
                        <DynamicSelect dataType="staff_ratios" value={support.staffRatio ?? ""}
                          onChange={value => updateArray('supports', i, { ...support, staffRatio: value })}
                          placeholder="Select ratio" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (from Admin)</label>
                        <input
                          type="text"
                          value={formatPricing(pricingMap[support.type])}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                          placeholder="Auto from pricing_items"
                        />
                        {pricingMap[support.type]?.serviceCode && (
                          <p className="mt-1 text-xs text-gray-500">
                            {pricingMap[support.type]?.serviceCode} • {formatPricing(pricingMap[support.type])}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                        <input type="text" value={support.provider ?? ""}
                          onChange={e => updateArray('supports', i, { ...support, provider: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Support Notes</label>
                      <textarea value={support.notes ?? ""}
                        onChange={e => updateArray('supports', i, { ...support, notes: e.target.value })}
                        rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                    </div>
                    {cp.supports.length > 1 && (
                      <button onClick={() => removeRow('supports', i)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm flex items-center gap-1">
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* MONITORING TAB */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Progress Measures</label>
                    <textarea value={cp.monitoring.progress_measures ?? ""}
                      onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, progress_measures: e.target.value }})}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Review Cadence</label>
                    <DynamicSelect dataType="review_frequencies" value={cp.monitoring.review_cadence ?? ""}
                      onChange={value => setCp({ ...cp, monitoring: { ...cp.monitoring, review_cadence: value }})}
                      placeholder="Select frequency" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reporting Requirements</label>
                    <textarea value={cp.monitoring.reporting_requirements ?? ""}
                      onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, reporting_requirements: e.target.value }})}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Key Contacts</label>
                    <textarea value={cp.monitoring.key_contacts ?? ""}
                      onChange={e => setCp({ ...cp, monitoring: { ...cp.monitoring, key_contacts: e.target.value }})}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* ADDITIONAL TAB */}
            {activeTab === 'additional' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Risk Considerations</label>
                    <textarea value={cp.risk_considerations ?? ""}
                      onChange={e => setCp({ ...cp, risk_considerations: e.target.value })}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contacts</label>
                    <textarea value={cp.emergency_contacts ?? ""}
                      onChange={e => setCp({ ...cp, emergency_contacts: e.target.value })}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cultural Considerations</label>
                    <textarea value={cp.cultural_considerations ?? ""}
                      onChange={e => setCp({ ...cp, cultural_considerations: e.target.value })}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Communication Preferences</label>
                    <textarea value={cp.communication_preferences ?? ""}
                      onChange={e => setCp({ ...cp, communication_preferences: e.target.value })}
                      rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => navigate(-1)}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Care Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
