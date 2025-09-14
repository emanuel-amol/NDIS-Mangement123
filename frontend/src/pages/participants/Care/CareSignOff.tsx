// frontend/src/pages/participants/Care/CareSignOff.tsx - Working Version
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  FileText, 
  Shield, 
  Home,
  User,
  Calendar,
  Award,
  AlertTriangle
} from "lucide-react";

interface CarePlan {
  id: string;
  participant_id: string;
  summary: string;
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

interface RiskAssessment {
  id: string;
  participant_id: string;
  context: any;
  risks: any[];
  status: "draft" | "complete";
  created_at: string;
  updated_at: string;
}

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

export default function CareSignoff() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  useEffect(() => {
    loadData();
  }, [participantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Mock participant data
      const getParticipantData = (): Participant => {
        if (participantId?.includes('1')) {
          return { id: participantId, first_name: 'Jordan', last_name: 'Smith', status: 'validated' };
        }
        if (participantId?.includes('2')) {
          return { id: participantId, first_name: 'Amrita', last_name: 'Kumar', status: 'validated' };
        }
        if (participantId?.includes('3')) {
          return { id: participantId, first_name: 'Linh', last_name: 'Nguyen', status: 'validated' };
        }
        return { id: participantId!, first_name: 'Sample', last_name: 'Participant', status: 'validated' };
      };

      const participantData = getParticipantData();
      setParticipant(participantData);

      // Mock care plan data - check if one exists for this participant
      const mockCarePlan: CarePlan = {
        id: `cp-${participantId}`,
        participant_id: participantId!,
        summary: "Comprehensive care plan including daily living skills support, community access, and therapy services to promote independence and social participation.",
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock risk assessment data
      const mockRiskAssessment: RiskAssessment = {
        id: `ra-${participantId}`,
        participant_id: participantId!,
        context: {
          environment: "Community and home settings",
          supports_involved: "Support workers, family members, therapy team"
        },
        risks: [
          { title: "Medication management", likelihood: "Medium", impact: "High" },
          { title: "Social isolation", likelihood: "Low", impact: "Medium" }
        ],
        status: "draft",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCarePlan(mockCarePlan);
      setRiskAssessment(mockRiskAssessment);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const finalize = async () => {
    if (!carePlan && !riskAssessment) {
      alert('No care plan or risk assessment found to finalize.');
      return;
    }

    setFinalizing(true);

    try {
      // Simulate API calls to update status
      console.log('Finalizing care plan and risk assessment...');
      
      // In a real app, you'd make API calls here:
      // if (carePlan) {
      //   await fetch(`/api/care-plans/${carePlan.id}`, {
      //     method: 'PUT',
      //     body: JSON.stringify({ status: 'complete' })
      //   });
      // }
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update local state
      if (carePlan) {
        setCarePlan({ ...carePlan, status: "complete" });
      }
      if (riskAssessment) {
        setRiskAssessment({ ...riskAssessment, status: "complete" });
      }

      setIsFinalized(true);
      
      // Show success message
      alert('Care plan and risk assessment have been successfully finalized!');

    } catch (error) {
      console.error('Error finalizing:', error);
      alert('Error finalizing documents. Please try again.');
    } finally {
      setFinalizing(false);
    }
  };

  const canFinalize = () => {
    return (carePlan || riskAssessment) && !isFinalized;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading care documents...</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Care Sign-off</h1>
                <p className="text-sm text-gray-600">
                  Final review and approval for {participant?.first_name} {participant?.last_name}
                </p>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Participant Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {participant?.first_name} {participant?.last_name}
              </h2>
              <p className="text-sm text-gray-600">Participant ID: {participant?.id}</p>
              <div className="flex items-center mt-2 space-x-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {participant?.status}
                </span>
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Sign-off: {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Review */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Care Plan Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 text-pink-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Care Plan</h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  carePlan?.status === "complete" 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {carePlan?.status === "complete" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-1" />
                      Draft
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {carePlan ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Summary</h4>
                    <p className="text-sm text-gray-600 mt-1">{carePlan.summary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <p className="text-gray-600">{new Date(carePlan.created_at).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Last Updated:</span>
                      <p className="text-gray-600">{new Date(carePlan.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/care/plan/${participantId}/edit`)}
                    className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Review & Edit
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No care plan found</p>
                  <button
                    onClick={() => navigate(`/care/plan/${participantId}/edit`)}
                    className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                  >
                    Create Care Plan
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Risk Assessment Panel */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="h-6 w-6 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                  riskAssessment?.status === "complete" 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {riskAssessment?.status === "complete" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      <Clock className="h-4 w-4 mr-1" />
                      Draft
                    </>
                  )}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              {riskAssessment ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Environment</h4>
                    <p className="text-sm text-gray-600 mt-1">{riskAssessment.context?.environment}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700">Identified Risks</h4>
                    <div className="mt-2 space-y-1">
                      {riskAssessment.risks?.map((risk, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          {risk.title} ({risk.likelihood} likelihood, {risk.impact} impact)
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/care/risk/${participantId}/edit`)}
                    className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Review & Edit
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No risk assessment found</p>
                  <button
                    onClick={() => navigate(`/care/risk/${participantId}/edit`)}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Create Risk Assessment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pre-sign-off Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-sign-off Checklist</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input type="checkbox" className="mr-3 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-gray-700">Participant & representative details verified</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-gray-700">Care Plan supports and pricing reviewed</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-gray-700">Risk controls acceptable and review date set</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-3 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="text-sm text-gray-700">Consent captured to proceed to Service Agreement</span>
            </label>
          </div>
        </div>

        {/* Status and Actions */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {isFinalized ? 'Documents Finalized' : 'Ready for Sign-off'}
              </h3>
              <p className="text-sm text-gray-600">
                {isFinalized 
                  ? 'All care documents have been completed and signed off. The participant is ready for service delivery.'
                  : 'Review the care plan and risk assessment, then finalize to complete the setup process.'
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {isFinalized ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  <span className="font-medium">Completed</span>
                </div>
              ) : (
                <button
                  onClick={finalize}
                  disabled={!canFinalize() || finalizing}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    canFinalize() && !finalizing
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {finalizing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <Award className="h-4 w-4 inline-block mr-2" />
                      Finalize & Sign-off
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success Message */}
        {isFinalized && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-3 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Care Setup Complete</h4>
                <p className="text-sm text-green-700 mt-1">
                  {participant?.first_name} {participant?.last_name} is now ready for service delivery. 
                  All care documents have been finalized and approved.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}