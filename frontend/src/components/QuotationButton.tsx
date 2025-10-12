// frontend/src/components/QuotationButton.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { withAuth } from '../services/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

interface QuotationButtonProps {
  participantId: number;
  participantName: string;
  hasCarePlan: boolean;
  carePlanFinalised: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
  onSuccess?: () => void;
  showManageLink?: boolean;
}

export default function QuotationButton({
  participantId,
  participantName,
  hasCarePlan,
  carePlanFinalised,
  className = '',
  size = 'md',
  variant = 'primary',
  onSuccess,
  showManageLink = true
}: QuotationButtonProps) {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerateQuotation = hasCarePlan && carePlanFinalised;

  const generateQuotation = async () => {
    if (!canGenerateQuotation) {
      if (!hasCarePlan) {
        alert('A care plan must be created before generating a quotation.');
        return;
      }
      if (!carePlanFinalised) {
        alert('The care plan must be finalised before generating a quotation.');
        return;
      }
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/quotations/participants/${participantId}/generate-from-care-plan`, {
  method: 'POST',
  headers: withAuth(),  // Changed from manual headers
});

      if (response.ok) {
        const newQuotation = await response.json();
        alert(`Quotation ${newQuotation.quote_number} generated successfully!`);
        
        if (onSuccess) {
          onSuccess();
        }
        
        // Navigate to the new quotation
        navigate(`/quotations/${newQuotation.id}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate quotation');
      }
    } catch (error) {
      console.error('Error generating quotation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate quotation';
      setError(errorMessage);
      alert(`Failed to generate quotation: ${errorMessage}`);
    } finally {
      setGenerating(false);
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const getVariantClasses = () => {
    if (!canGenerateQuotation) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    }

    switch (variant) {
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700';
      case 'outline':
        return 'border border-blue-600 text-blue-600 hover:bg-blue-50';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700';
    }
  };

  const getStatusInfo = () => {
    if (!hasCarePlan) {
      return {
        icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        message: 'Care plan required',
        color: 'text-red-600'
      };
    }
    
    if (!carePlanFinalised) {
      return {
        icon: <Clock className="h-4 w-4 text-yellow-500" />,
        message: 'Care plan needs finalisation',
        color: 'text-yellow-600'
      };
    }
    
    return {
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      message: 'Ready to generate',
      color: 'text-green-600'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Main Button */}
      <div className="flex items-center space-x-3">
        <button
          onClick={generateQuotation}
          disabled={!canGenerateQuotation || generating}
          className={`
            inline-flex items-center gap-2 rounded-lg font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getSizeClasses()}
            ${getVariantClasses()}
          `}
        >
          {generating ? (
            <>
              <Clock className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Generate Quotation
            </>
          )}
        </button>

        {showManageLink && (
          <button
            onClick={() => navigate(`/quotations/participants/${participantId}`)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FileText className="h-4 w-4" />
            Manage Quotations
          </button>
        )}
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        {statusInfo.icon}
        <span className={`text-xs font-medium ${statusInfo.color}`}>
          {statusInfo.message}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!canGenerateQuotation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs text-blue-700">
            <p className="font-medium mb-1">To generate a quotation:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {!hasCarePlan && (
                <li>Create a care plan for {participantName}</li>
              )}
              {hasCarePlan && !carePlanFinalised && (
                <li>Finalise the care plan</li>
              )}
              <li>Ensure the care plan includes support services</li>
              <li>Verify pricing items are configured in the system</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}