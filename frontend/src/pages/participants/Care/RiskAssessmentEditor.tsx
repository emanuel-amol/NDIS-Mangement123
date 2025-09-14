// frontend/src/pages/participants/Care/RiskAssessmentEditor.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Home, Shield, AlertTriangle, Users } from "lucide-react";
import { DynamicSelect } from "../../../components/DynamicSelect";
import { DynamicRadio } from "../../../components/DynamicRadio";

type Risk = {
  id: string;
  category: string;
  title: string;
  description: string;
  likelihood: string;
  impact: string;
  riskLevel: string;
  mitigationStrategies: string;
  responsiblePerson: string;
  reviewDate: string;
  status: string;
};

type RiskAssessment = {
  id?: string;
  participant_id: string;
  assessment_date: string;
  assessor_name: string;
  assessor_role: string;
  review_date: string;
  context: {
    environment: string;
    supports_involved: string;
    activities_assessed: string;
    communication_methods: string;
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
  approval_status: "draft" | "complete" | "approved";
  notes: string;
};

export default function RiskAssessmentEditor() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const [ra, setRa] = useState<RiskAssessment>({
    participant_id: participantId!,
    assessment_date: new Date().toISOString().split('T')[0],
    assessor_name: "",
    assessor_role: "",
    review_date: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months from now
    context: {
      environment: "",
      supports_involved: "",
      activities_assessed: "",
      communication_methods: ""
    },
    risks: [{
      id: "1",
      category: "",
      title: "",
      description: "",
      likelihood: "",
      impact: "",
      riskLevel: "",
      mitigationStrategies: "",
      responsiblePerson: "",
      reviewDate: "",
      status: "identified"
    }],
    overall_risk_rating: "",
    emergency_procedures: "",
    monitoring_requirements: "",
    staff_training_needs: "",
    equipment_requirements: "",
    environmental_modifications: "",
    communication_plan: "",
    family_involvement: "",
    external_services: "",
    review_schedule: "Monthly",
    approval_status: "draft",
    notes: ""
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
    setLoading(false);
  }, [participantId]);

  const save = async () => {
    if (!ra.assessor_name || !ra.context.environment) {
      alert("Assessor name and environment are required");
      return;
    }
    setSaving(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Saving risk assessment:', ra);
      
      alert('Risk assessment saved successfully!');
      navigate(`/care/signoff/${participantId}`);
    } catch (error) {
      console.error('Error saving risk assessment:', error);
      alert('Error saving risk assessment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateRisk = (index: number, updates: Partial<Risk>) => {
    const newRisks = [...ra.risks];
    newRisks[index] = { ...newRisks[index], ...updates };
    
    // Auto-calculate risk level based on likelihood and impact
    if (updates.likelihood || updates.impact) {
      const risk = newRisks[index];
      if (risk.likelihood && risk.impact) {
        risk.riskLevel = calculateRiskLevel(risk.likelihood, risk.impact);
      }
    }
    
    setRa({ ...ra, risks: newRisks });
  };

  const calculateRiskLevel = (likelihood: string, impact: string): string => {
    const likelihoodScore = { 'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5 }[likelihood] || 0;
    const impactScore = { 'very_low': 1, 'low': 2, 'medium': 3, 'high': 4, 'very_high': 5 }[impact] || 0;
    const totalScore = likelihoodScore * impactScore;
    
    if (totalScore <= 4) return 'low';
    if (totalScore <= 12) return 'medium';
    return 'high';
  };

  const addRisk = () => {
    const newRisk: Risk = {
      id: Date.now().toString(),
      category: "",
      title: "",
      description: "",
      likelihood: "",
      impact: "",
      riskLevel: "",
      mitigationStrategies: "",
      responsiblePerson: "",
      reviewDate: "",
      status: "identified"
    };
    setRa({ ...ra, risks: [...ra.risks, newRisk] });
  };

  const removeRisk = (index: number) => {
    if (ra.risks.length > 1) {
      const newRisks = ra.risks.filter((_, i) => i !== index);
      setRa({ ...ra, risks: newRisks });
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading risk assessment...</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Risk Assessment Editor</h1>
                <p className="text-sm text-gray-600">Assessing risks for {participantName}</p>
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
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Assessment Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Assessment Details</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={ra.assessment_date}
                  onChange={e => setRa({ ...ra, assessment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ra.assessor_name}
                  onChange={e => setRa({ ...ra, assessor_name: e.target.value })}
                  placeholder="Enter assessor's full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessor Role
                </label>
                <DynamicSelect
                  dataType="assessor_roles"
                  value={ra.assessor_role}
                  onChange={value => setRa({ ...ra, assessor_role: value })}
                  placeholder="Select role"
                  includeOther={true}
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Review Date
              </label>
              <input
                type="date"
                value={ra.review_date}
                onChange={e => setRa({ ...ra, review_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Context */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assessment Context</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Environment/Setting <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={ra.context.environment}
                  onChange={e => setRa({ ...ra, context: { ...ra.context, environment: e.target.value } })}
                  placeholder="Describe the environment where risks are being assessed..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Supports Involved
                </label>
                <textarea
                  value={ra.context.supports_involved}
                  onChange={e => setRa({ ...ra, context: { ...ra.context, supports_involved: e.target.value } })}
                  placeholder="List support workers, family members, or other people involved..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activities Assessed
                </label>
                <textarea
                  value={ra.context.activities_assessed}
                  onChange={e => setRa({ ...ra, context: { ...ra.context, activities_assessed: e.target.value } })}
                  placeholder="Describe the activities or situations being assessed for risk..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Communication Methods
                </label>
                <textarea
                  value={ra.context.communication_methods}
                  onChange={e => setRa({ ...ra, context: { ...ra.context, communication_methods: e.target.value } })}
                  placeholder="How does the participant communicate? Any specific needs?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Risks */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h2 className="text-lg font-semibold text-gray-900">Identified Risks</h2>
              </div>
              <button
                onClick={addRisk}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus size={16} />
                Add Risk
              </button>
            </div>
            
            {ra.risks.map((risk, index) => (
              <div key={risk.id} className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Category</label>
                    <DynamicSelect
                      dataType="risk_categories"
                      value={risk.category}
                      onChange={value => updateRisk(index, { category: value })}
                      placeholder="Select category"
                      includeOther={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Title</label>
                    <input
                      type="text"
                      value={risk.title}
                      onChange={e => updateRisk(index, { title: e.target.value })}
                      placeholder="Brief description of the risk"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
                    <div className="flex items-center">
                      <span className={`px-3 py-2 rounded-lg text-sm font-medium ${getRiskLevelColor(risk.riskLevel)}`}>
                        {risk.riskLevel ? risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1) : 'Not calculated'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Description</label>
                  <textarea
                    value={risk.description}
                    onChange={e => updateRisk(index, { description: e.target.value })}
                    placeholder="Detailed description of the risk..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
                    <DynamicSelect
                      dataType="risk_likelihood"
                      value={risk.likelihood}
                      onChange={value => updateRisk(index, { likelihood: value })}
                      placeholder="Select likelihood"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
                    <DynamicSelect
                      dataType="risk_impact"
                      value={risk.impact}
                      onChange={value => updateRisk(index, { impact: value })}
                      placeholder="Select impact"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mitigation Strategies</label>
                  <textarea
                    value={risk.mitigationStrategies}
                    onChange={e => updateRisk(index, { mitigationStrategies: e.target.value })}
                    placeholder="What strategies will be used to prevent or reduce this risk?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person</label>
                    <input
                      type="text"
                      value={risk.responsiblePerson}
                      onChange={e => updateRisk(index, { responsiblePerson: e.target.value })}
                      placeholder="Who is responsible for managing this risk?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
                    <input
                      type="date"
                      value={risk.reviewDate}
                      onChange={e => updateRisk(index, { reviewDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <DynamicSelect
                      dataType="risk_status"
                      value={risk.status}
                      onChange={value => updateRisk(index, { status: value })}
                      placeholder="Select status"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  {ra.risks.length > 1 && (
                    <button
                      onClick={() => removeRisk(index)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                      Remove Risk
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall Assessment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Assessment</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Risk Rating
                </label>
                <DynamicSelect
                  dataType="overall_risk_ratings"
                  value={ra.overall_risk_rating}
                  onChange={value => setRa({ ...ra, overall_risk_rating: value })}
                  placeholder="Select overall risk level"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Schedule
                </label>
                <DynamicSelect
                  dataType="review_frequencies"
                  value={ra.review_schedule}
                  onChange={value => setRa({ ...ra, review_schedule: value })}
                  placeholder="How often should this be reviewed?"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Emergency Procedures
                </label>
                <textarea
                  value={ra.emergency_procedures}
                  onChange={e => setRa({ ...ra, emergency_procedures: e.target.value })}
                  placeholder="What should be done in an emergency?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monitoring Requirements
                </label>
                <textarea
                  value={ra.monitoring_requirements}
                  onChange={e => setRa({ ...ra, monitoring_requirements: e.target.value })}
                  placeholder="How will risks be monitored on an ongoing basis?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Training Needs
                </label>
                <textarea
                  value={ra.staff_training_needs}
                  onChange={e => setRa({ ...ra, staff_training_needs: e.target.value })}
                  placeholder="What training do staff need to manage these risks?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equipment Requirements
                </label>
                <textarea
                  value={ra.equipment_requirements}
                  onChange={e => setRa({ ...ra, equipment_requirements: e.target.value })}
                  placeholder="What equipment is needed to manage risks?"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assessment Notes
              </label>
              <textarea
                value={ra.notes}
                onChange={e => setRa({ ...ra, notes: e.target.value })}
                placeholder="Any additional notes or observations..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
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
                onClick={() => setRa({ ...ra, approval_status: "draft" })}
                className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Save as Draft
              </button>
              <button
                onClick={save}
                disabled={saving || !ra.assessor_name || !ra.context.environment}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Shield size={16} />
                {saving ? 'Saving...' : 'Save Assessment'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}