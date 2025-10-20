// frontend/src/services/ai.ts - COMPLETE AI SERVICE
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';

export interface AIResponse {
  ok: boolean;
  suggestion_id: number;
  data: {
    markdown?: string;
    raw?: string;
    summary?: string;
    [key: string]: any;
  };
  metadata?: {
    text_length?: number;
    suggestions_count?: number;
    notes_count?: number;
  };
}

export interface ParticipantContext {
  id: number;
  name?: string;
  age?: number;
  disability_type?: string;
  support_category?: string;
  risk_level?: string;
  goals?: any[];
  plan_type?: string;
  cultural_considerations?: string;
  [key: string]: any;
}

// AI Care Plan Suggestion
export async function aiCarePlanSuggest(
  participantId: number,
  participantContext: ParticipantContext,
  carePlanData?: any
): Promise<AIResponse> {
  const response = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/care-plan/suggest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participantContext,
      carePlanDraft: carePlanData
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Care Plan request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// AI Risk Assessment
export async function aiRiskAssess(
  participantId: number,
  notes: string[]
): Promise<AIResponse> {
  const response = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/risk/assess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notes
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Risk Assessment request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// AI Clinical Note Generation
export async function aiClinicalNote(
  participantId: number,
  interactionSummary: string,
  sessionType: string = 'support_session',
  duration?: string
): Promise<AIResponse> {
  const response = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/notes/clinical`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interactionSummary: `${sessionType.replace('_', ' ').toUpperCase()}${duration ? ` (${duration})` : ''}: ${interactionSummary}`
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Clinical Note request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get AI Status
export async function getAIStatus(): Promise<{
  available: boolean;
  provider: string;
  features: string[];
  configuration: any;
}> {
  const response = await fetch(`${API_BASE_URL}/ai/status`);
  
  if (!response.ok) {
    throw new Error(`AI Status request failed: ${response.status}`);
  }

  return response.json();
}

// Get AI Suggestion History
export async function getAISuggestionHistory(
  participantId: number,
  limit: number = 20
): Promise<{
  suggestions: any[];
  total: number;
}> {
  const response = await fetch(`${API_BASE_URL}/participants/${participantId}/ai/suggestions/history?limit=${limit}`);
  
  if (!response.ok) {
    // If endpoint doesn't exist, return empty results
    if (response.status === 404) {
      return { suggestions: [], total: 0 };
    }
    throw new Error(`AI History request failed: ${response.status}`);
  }

  return response.json();
}

// Convert AI markdown to structured suggestions
export function parseAICarePlan(aiResponse: AIResponse): {
  id: string;
  type: 'ai_goal' | 'ai_support' | 'ai_outcome' | 'ai_general';
  title: string;
  description: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  applicable: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
  implementation?: string;
  estimatedImpact?: string;
}[] {
  const suggestions = [];
  const markdown = aiResponse.data?.markdown || aiResponse.data?.raw || '';
  
  if (!markdown) return [];

  // Parse the AI-generated care plan into structured suggestions
  const lines = markdown.split('\n').filter(line => line.trim());
  
  let currentSection = '';
  let goalCount = 0;
  let supportCount = 0;
  let outcomeCount = 0;

  for (const line of lines) {
    const cleanLine = line.trim();
    
    // Detect sections
    if (cleanLine.toLowerCase().includes('goal')) {
      currentSection = 'goals';
      continue;
    } else if (cleanLine.toLowerCase().includes('support') || cleanLine.toLowerCase().includes('recommend')) {
      currentSection = 'supports';
      continue;
    } else if (cleanLine.toLowerCase().includes('outcome') || cleanLine.toLowerCase().includes('measur')) {
      currentSection = 'outcomes';
      continue;
    }
    
    // Extract items (lines starting with numbers, bullets, or dashes)
    if (/^[\d\-\*\+]/.test(cleanLine) && cleanLine.length > 10) {
      const content = cleanLine.replace(/^[\d\-\*\+\.\)\s]+/, '').trim();
      
      if (content && currentSection) {
        let suggestion;
        
        if (currentSection === 'goals') {
          goalCount++;
          suggestion = {
            id: `ai_goal_${goalCount}`,
            type: 'ai_goal' as const,
            title: `AI Goal ${goalCount}: ${content.split('.')[0] || content.substring(0, 50)}`,
            description: content,
            reasoning: 'Generated by IBM Watsonx AI based on participant profile and evidence-based practices',
            confidence: 'high' as const,
            applicable: true,
            category: 'ai_generated_goal',
            priority: 'high' as const,
            implementation: 'Review with participant and support team, establish timeline and milestones',
            estimatedImpact: 'Expected improvement in targeted area within 3-6 months'
          };
        } else if (currentSection === 'supports') {
          supportCount++;
          suggestion = {
            id: `ai_support_${supportCount}`,
            type: 'ai_support' as const,
            title: `AI Support ${supportCount}: ${content.split('.')[0] || content.substring(0, 50)}`,
            description: content,
            reasoning: 'AI-recommended support based on participant needs and best practice guidelines',
            confidence: 'high' as const,
            applicable: true,
            category: 'ai_generated_support',
            priority: 'medium' as const,
            implementation: 'Coordinate with service providers and establish support schedule',
            estimatedImpact: 'Enhanced support delivery and participant outcomes'
          };
        } else if (currentSection === 'outcomes') {
          outcomeCount++;
          suggestion = {
            id: `ai_outcome_${outcomeCount}`,
            type: 'ai_outcome' as const,
            title: `AI Outcome ${outcomeCount}: ${content.split('.')[0] || content.substring(0, 50)}`,
            description: content,
            reasoning: 'AI-generated measurable outcome to track progress and success',
            confidence: 'high' as const,
            applicable: true,
            category: 'ai_generated_outcome',
            priority: 'medium' as const,
            implementation: 'Establish baseline measurements and regular review schedule',
            estimatedImpact: 'Clear tracking of participant progress and goal achievement'
          };
        }
        
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  // If no structured content found, create a general suggestion with the full AI response
  if (suggestions.length === 0 && markdown.length > 50) {
    suggestions.push({
      id: `ai_general_${aiResponse.suggestion_id}`,
      type: 'ai_general' as const,
      title: 'AI-Generated Care Plan Recommendations',
      description: markdown.substring(0, 300) + (markdown.length > 300 ? '...' : ''),
      reasoning: 'Comprehensive care plan generated by IBM Watsonx AI based on participant data',
      confidence: 'high' as const,
      applicable: true,
      category: 'ai_generated_plan',
      priority: 'high' as const,
      implementation: 'Review full AI-generated content and integrate relevant recommendations',
      estimatedImpact: 'Improved care planning based on AI analysis of participant needs'
    });
  }

  return suggestions;
}

// Parse AI risk assessment
export function parseAIRiskAssessment(aiResponse: AIResponse): {
  id: string;
  type: 'risk';
  title: string;
  description: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  applicable: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
  riskLevel?: string;
  mitigations?: string[];
} {
  const content = aiResponse.data?.summary || aiResponse.data?.markdown || aiResponse.data?.raw || '';
  
  return {
    id: `ai_risk_${aiResponse.suggestion_id}`,
    type: 'risk',
    title: 'AI Risk Assessment',
    description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
    reasoning: 'Risk assessment generated by IBM Watsonx AI based on case notes and participant history',
    confidence: 'high',
    applicable: true,
    category: 'ai_risk_assessment',
    priority: 'high',
    riskLevel: 'Under AI Review',
    mitigations: ['Review full AI assessment', 'Implement recommended safety measures', 'Regular monitoring and updates']
  };
}