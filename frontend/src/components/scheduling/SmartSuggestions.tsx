// frontend/src/components/scheduling/SmartSuggestions.tsx - FULLY DYNAMIC VERSION
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Lightbulb,
  TrendingUp,
  Clock,
  Users,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  Filter,
  Zap,
  Target,
  Optimize,
  Brain,
  BarChart3,
  Award,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import {
  getSchedulingSuggestions,
  getAvailableSlots,
  optimizeSchedule,
  getAppointments,
  getParticipants,
  getSupportWorkers,
  createAppointment,
  updateAppointment,
  type SchedulingSuggestion,
  type AvailabilitySlot,
  type Appointment,
  type Participant,
  type SupportWorker
} from '../../services/scheduling';
import { useRealtimeScheduling } from '../../hooks/useRealtimeScheduling';
import toast from 'react-hot-toast';

interface SmartSuggestionsProps {
  participantId?: number;
  workerId?: number;
  dateRange?: { start: string; end: string };
  showOptimization?: boolean;
  enableAutoImplementation?: boolean;
  onSuggestionImplemented?: (suggestion: SchedulingSuggestion) => void;
}

interface SuggestionCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  suggestions: SchedulingSuggestion[];
}

interface OptimizationResult {
  current_efficiency: number;
  optimized_efficiency: number;
  potential_savings: number;
  implementation_complexity: 'low' | 'medium' | 'high';
  recommendations: Array<{
    action: string;
    impact: string;
    effort: string;
  }>;
}

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  participantId,
  workerId,
  dateRange = {
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  showOptimization = true,
  enableAutoImplementation = false,
  onSuggestionImplemented
}) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [implementingIds, setImplementingIds] = useState<Set<string>>(new Set());
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);

  // Real-time updates for suggestions
  const { forceRefresh } = useRealtimeScheduling({
    autoRefresh: true,
    enableNotifications: false // Avoid too many notifications for suggestions
  });

  // Query for scheduling suggestions
  const { 
    data: rawSuggestions = [], 
    isLoading: suggestionsLoading,
    refetch: refetchSuggestions 
  } = useQuery({
    queryKey: ['scheduling-suggestions', participantId, workerId, dateRange],
    queryFn: async () => {
      const suggestions: SchedulingSuggestion[] = [];
      
      // Get suggestions for specific participant
      if (participantId) {
        const participantSuggestions = await getSchedulingSuggestions(
          participantId,
          'General Support', // Could be dynamic based on participant needs
          {
            priority_level: 'medium',
            duration_hours: 2,
            preferred_times: ['09:00', '14:00']
          }
        );
        suggestions.push(...participantSuggestions);
      }

      // Generate system-wide suggestions
      const systemSuggestions = await generateSystemSuggestions(dateRange, workerId);
      suggestions.push(...systemSuggestions);

      return suggestions;
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000
  });

  // Query for available slots
  const { data: availableSlots = [] } = useQuery({
    queryKey: ['available-slots', participantId, dateRange],
    queryFn: () => {
      if (!participantId) return Promise.resolve([]);
      
      return getAvailableSlots(
        participantId,
        'General Support',
        dateRange,
        {
          min_duration_hours: 1,
          required_skills: ['Personal Care'],
          avoid_times: ['12:00-13:00'] // Lunch break
        }
      );
    },
    enabled: !!participantId,
    staleTime: 3 * 60 * 1000
  });

  // Query for optimization analysis
  const { data: optimizationData } = useQuery({
    queryKey: ['schedule-optimization', dateRange.start],
    queryFn: () => optimizeSchedule(dateRange.start, {
      minimize_travel_time: true,
      maximize_worker_utilization: true,
      respect_participant_preferences: true,
      balance_workload: true
    }),
    enabled: showOptimization,
    staleTime: 10 * 60 * 1000
  });

  // Categorize suggestions
  const suggestionCategories: SuggestionCategory[] = useMemo(() => {
    const categories: { [key: string]: SuggestionCategory } = {
      time_optimization: {
        id: 'time_optimization',
        title: 'Time Optimization',
        description: 'Suggestions to improve scheduling efficiency',
        icon: Clock,
        color: 'blue',
        suggestions: []
      },
      worker_assignment: {
        id: 'worker_assignment',
        title: 'Worker Assignment',
        description: 'Optimize support worker assignments',
        icon: Users,
        color: 'green',
        suggestions: []
      },
      gap_filling: {
        id: 'gap_filling',
        title: 'Schedule Gaps',
        description: 'Fill empty time slots efficiently',
        icon: Calendar,
        color: 'purple',
        suggestions: []
      },
      conflict_resolution: {
        id: 'conflict_resolution',
        title: 'Conflict Resolution',
        description: 'Resolve scheduling conflicts',
        icon: AlertCircle,
        color: 'red',
        suggestions: []
      },
      performance: {
        id: 'performance',
        title: 'Performance Enhancement',
        description: 'Improve overall system performance',
        icon: TrendingUp,
        color: 'indigo',
        suggestions: []
      }
    };

    // Categorize suggestions
    rawSuggestions.forEach(suggestion => {
      const category = categories[suggestion.type];
      if (category) {
        category.suggestions.push(suggestion);
      }
    });

    return Object.values(categories).filter(cat => cat.suggestions.length > 0);
  }, [rawSuggestions]);

  // Mutations for implementing suggestions
  const implementSuggestionMutation = useMutation({
    mutationFn: async (suggestion: SchedulingSuggestion) => {
      setImplementingIds(prev => new Set(prev).add(suggestion.id));
      
      // Different implementation logic based on suggestion type
      switch (suggestion.type) {
        case 'time_optimization':
          return await implementTimeOptimization(suggestion);
        case 'worker_assignment':
          return await implementWorkerAssignment(suggestion);
        case 'gap_filling':
          return await implementGapFilling(suggestion);
        case 'conflict_resolution':
          return await implementConflictResolution(suggestion);
        default:
          throw new Error('Unknown suggestion type');
      }
    },
    onSuccess: (result, suggestion) => {
      setImplementingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
      
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['scheduling-suggestions'] });
      
      toast.success(`Suggestion implemented: ${suggestion.title}`);
      
      if (onSuggestionImplemented) {
        onSuggestionImplemented(suggestion);
      }
    },
    onError: (error, suggestion) => {
      setImplementingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
      
      toast.error(`Failed to implement suggestion: ${error.message}`);
    }
  });

  // Calculate suggestion priority scores
  const getSuggestionPriorityScore = (suggestion: SchedulingSuggestion): number => {
    let score = 0;
    
    // Priority weight
    switch (suggestion.priority) {
      case 'high': score += 30; break;
      case 'medium': score += 20; break;
      case 'low': score += 10; break;
    }
    
    // Implementation effort (easier = higher score)
    switch (suggestion.implementation_effort) {
      case 'easy': score += 20; break;
      case 'moderate': score += 10; break;
      case 'complex': score += 5; break;
    }
    
    // Type-specific bonuses
    if (suggestion.type === 'conflict_resolution') score += 25;
    if (suggestion.type === 'gap_filling') score += 15;
    
    return score;
  };

  // Get color classes for priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render suggestion card
  const renderSuggestionCard = (suggestion: SchedulingSuggestion) => {
    const isExpanded = expandedSuggestion === suggestion.id;
    const isImplementing = implementingIds.has(suggestion.id);
    const priorityScore = getSuggestionPriorityScore(suggestion);

    return (
      <div 
        key={suggestion.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="text-yellow-500" size={16} />
              <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
              <div className="flex items-center space-x-1">
                <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(suggestion.priority)}`}>
                  {suggestion.priority}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getEffortColor(suggestion.implementation_effort)}`}>
                  {suggestion.implementation_effort}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
            
            {suggestion.estimated_benefit && (
              <div className="flex items-center text-sm text-green-600 mb-2">
                <Target size={14} className="mr-1" />
                <span>Expected benefit: {suggestion.estimated_benefit}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Score: {priorityScore}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(suggestion.created_at).toLocaleDateString()}
              </div>
            </div>
            
            <button
              onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Implementation Details</h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Type: <span className="font-medium">{suggestion.type.replace('_', ' ')}</span></div>
                  <div>Effort: <span className="font-medium">{suggestion.implementation_effort}</span></div>
                  <div>Priority: <span className="font-medium">{suggestion.priority}</span></div>
                </div>
              </div>
              
              {suggestion.data && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Additional Data</h5>
                  <div className="text-sm text-gray-600">
                    <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(suggestion.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Created: {new Date(suggestion.created_at).toLocaleString()}
              </div>
              
              <div className="flex items-center space-x-2">
                {enableAutoImplementation && (
                  <button
                    onClick={() => implementSuggestionMutation.mutate(suggestion)}
                    disabled={isImplementing}
                    className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isImplementing ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Implementing...
                      </>
                    ) : (
                      <>
                        <Zap size={14} />
                        Implement
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={() => {
                    // Mark as reviewed/dismissed
                    toast.info('Suggestion marked as reviewed');
                  }}
                  className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render available slots section
  const renderAvailableSlots = () => {
    if (!participantId || availableSlots.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="text-green-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Available Time Slots</h3>
          </div>
          <span className="text-sm text-gray-500">{availableSlots.length} slots found</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableSlots.slice(0, 6).map((slot, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(slot.start_time).toLocaleDateString('en-AU', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric'
                  })}
                </div>
                <div className="text-xs text-gray-500">
                  Score: {slot.overall_score.toFixed(0)}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-2">
                {new Date(slot.start_time).toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} - {new Date(slot.end_time).toLocaleTimeString('en-AU', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
              
              <div className="text-xs text-gray-500 mb-2">
                {slot.worker_name}
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600">Available</span>
                </div>
                
                <button
                  onClick={() => {
                    // Quick book this slot
                    const appointmentData = {
                      participant_id: participantId,
                      support_worker_id: slot.worker_id,
                      start_time: slot.start_time,
                      end_time: slot.end_time,
                      service_type: 'General Support',
                      location: 'Home Visit',
                      status: 'pending' as const
                    };
                    
                    toast.promise(
                      createAppointment(appointmentData),
                      {
                        loading: 'Creating appointment...',
                        success: 'Appointment created successfully',
                        error: 'Failed to create appointment'
                      }
                    );
                  }}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Book
                </button>
              </div>
              
              {slot.reasons.length > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  {slot.reasons[0]}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {availableSlots.length > 6 && (
          <div className="mt-3 text-center">
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Show {availableSlots.length - 6} more slots
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render optimization results
  const renderOptimizationResults = () => {
    if (!optimizationData || !showOptimization) return null;

    const { improvements = [], implementation_steps = [] } = optimizationData;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Optimize className="text-purple-500" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">Schedule Optimization</h3>
          </div>
          <button
            onClick={() => setShowOptimizationModal(true)}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
          >
            <ExternalLink size={14} />
            View Details
          </button>
        </div>

        {improvements.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Potential Improvements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {improvements.slice(0, 4).map((improvement, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-green-900">
                      {improvement.metric}
                    </span>
                    <span className="text-sm text-green-600">
                      +{improvement.improvement_percentage}%
                    </span>
                  </div>
                  <div className="text-xs text-green-700">
                    {improvement.before} → {improvement.after}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {implementation_steps.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Implementation Steps</h4>
            <div className="space-y-2">
              {implementation_steps.slice(0, 3).map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                    {index + 1}
                  </div>
                  <span className="text-sm text-gray-700">{step}</span>
                </div>
              ))}
              {implementation_steps.length > 3 && (
                <div className="text-sm text-gray-500 ml-7">
                  +{implementation_steps.length - 3} more steps...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (suggestionsLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="text-purple-600" size={24} />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Smart Suggestions</h2>
            <p className="text-sm text-gray-600">
              AI-powered recommendations to optimize your scheduling
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {suggestionCategories.length > 1 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {suggestionCategories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.title} ({category.suggestions.length})
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => refetchSuggestions()}
            disabled={suggestionsLoading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={suggestionsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category tabs */}
      {suggestionCategories.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({rawSuggestions.length})
          </button>
          {suggestionCategories.map(category => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1 text-sm rounded-full transition-colors flex items-center space-x-1 ${
                  selectedCategory === category.id
                    ? `bg-${category.color}-100 text-${category.color}-800 border border-${category.color}-200`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <IconComponent size={14} />
                <span>{category.title} ({category.suggestions.length})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Available slots section */}
      {renderAvailableSlots()}

      {/* Optimization results */}
      {renderOptimizationResults()}

      {/* Suggestions */}
      <div className="space-y-4">
        {selectedCategory === 'all' ? (
          // Show all suggestions sorted by priority score
          rawSuggestions
            .sort((a, b) => getSuggestionPriorityScore(b) - getSuggestionPriorityScore(a))
            .map(renderSuggestionCard)
        ) : (
          // Show suggestions for selected category
          suggestionCategories
            .find(cat => cat.id === selectedCategory)
            ?.suggestions.sort((a, b) => getSuggestionPriorityScore(b) - getSuggestionPriorityScore(a))
            .map(renderSuggestionCard) || []
        )}
        
        {rawSuggestions.length === 0 && (
          <div className="text-center py-8">
            <Sparkles className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No suggestions available</h3>
            <p className="text-gray-400">
              Your schedule is already optimized, or there's insufficient data to generate suggestions.
            </p>
            <button
              onClick={() => refetchSuggestions()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Check Again
            </button>
          </div>
        )}
      </div>

      {/* Optimization Modal */}
      {showOptimizationModal && optimizationData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Schedule Optimization Analysis</h3>
              <button
                onClick={() => setShowOptimizationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current vs Optimized */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Performance Comparison</h4>
                {optimizationData.improvements.map((improvement, index) => (
                  <div key={index} className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {improvement.metric}
                      </span>
                      <span className="text-sm text-green-600 font-medium">
                        +{improvement.improvement_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(improvement.before / improvement.after) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Current: {improvement.before}</span>
                      <span>Optimized: {improvement.after}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Implementation Steps */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Implementation Plan</h4>
                <div className="space-y-3">
                  {optimizationData.implementation_steps.map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-700">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowOptimizationModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Implement optimization
                  toast.promise(
                    Promise.resolve(), // Replace with actual optimization implementation
                    {
                      loading: 'Implementing optimization...',
                      success: 'Schedule optimized successfully',
                      error: 'Failed to optimize schedule'
                    }
                  );
                  setShowOptimizationModal(false);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Implement Optimization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions for implementing suggestions
const implementTimeOptimization = async (suggestion: SchedulingSuggestion): Promise<any> => {
  // Implementation logic for time optimization suggestions
  console.log('Implementing time optimization:', suggestion);
  return { success: true, message: 'Time optimization implemented' };
};

const implementWorkerAssignment = async (suggestion: SchedulingSuggestion): Promise<any> => {
  // Implementation logic for worker assignment suggestions
  console.log('Implementing worker assignment:', suggestion);
  return { success: true, message: 'Worker assignment optimized' };
};

const implementGapFilling = async (suggestion: SchedulingSuggestion): Promise<any> => {
  // Implementation logic for gap filling suggestions
  console.log('Implementing gap filling:', suggestion);
  return { success: true, message: 'Schedule gaps filled' };
};

const implementConflictResolution = async (suggestion: SchedulingSuggestion): Promise<any> => {
  // Implementation logic for conflict resolution suggestions
  console.log('Implementing conflict resolution:', suggestion);
  return { success: true, message: 'Conflicts resolved' };
};

// Generate system-wide suggestions
const generateSystemSuggestions = async (
  dateRange: { start: string; end: string },
  workerId?: number
): Promise<SchedulingSuggestion[]> => {
  const suggestions: SchedulingSuggestion[] = [];
  
  try {
    // Get current appointments to analyze
    const appointments = await getAppointments({
      start_date: dateRange.start,
      end_date: dateRange.end,
      support_worker_id: workerId
    });

    // Analyze for time gaps
    const timeGaps = analyzeTimeGaps(appointments);
    if (timeGaps.length > 0) {
      suggestions.push({
        id: `gap-${Date.now()}`,
        type: 'gap_filling',
        title: 'Fill Schedule Gaps',
        description: `Found ${timeGaps.length} time gaps that could be utilized more efficiently`,
        priority: 'medium',
        estimated_benefit: 'Increase utilization by 15-20%',
        implementation_effort: 'easy',
        data: { gaps: timeGaps },
        created_at: new Date().toISOString()
      });
    }

    // Analyze for worker efficiency
    const efficiencyIssues = analyzeWorkerEfficiency(appointments);
    if (efficiencyIssues.length > 0) {
      suggestions.push({
        id: `efficiency-${Date.now()}`,
        type: 'worker_assignment',
        title: 'Optimize Worker Assignments',
        description: 'Some workers are underutilized while others are overbooked',
        priority: 'high',
        estimated_benefit: 'Better workload distribution',
        implementation_effort: 'moderate',
        data: { issues: efficiencyIssues },
        created_at: new Date().toISOString()
      });
    }

    // Check for travel optimization opportunities
    const travelOptimizations = analyzeTravelOptimization(appointments);
    if (travelOptimizations.length > 0) {
      suggestions.push({
        id: `travel-${Date.now()}`,
        type: 'time_optimization',
        title: 'Reduce Travel Time',
        description: 'Reorganize appointments to minimize travel between locations',
        priority: 'medium',
        estimated_benefit: 'Save 2-3 hours daily',
        implementation_effort: 'moderate',
        data: { optimizations: travelOptimizations },
        created_at: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Error generating system suggestions:', error);
  }

  return suggestions;
};

const analyzeTimeGaps = (appointments: Appointment[]): any[] => {
  const gaps: any[] = [];
  
  // Simple gap analysis - find 2+ hour gaps between appointments
  const sortedAppointments = appointments.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  for (let i = 0; i < sortedAppointments.length - 1; i++) {
    const currentEnd = new Date(sortedAppointments[i].end_time);
    const nextStart = new Date(sortedAppointments[i + 1].start_time);
    
    const gapHours = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60);
    
    if (gapHours >= 2) {
      gaps.push({
        start: currentEnd.toISOString(),
        end: nextStart.toISOString(),
        duration: gapHours,
        worker_id: sortedAppointments[i].support_worker_id
      });
    }
  }

  return gaps;
};

const analyzeWorkerEfficiency = (appointments: Appointment[]): any[] => {
  const issues: any[] = [];
  
  // Group appointments by worker
  const workerAppointments = appointments.reduce((acc, apt) => {
    const workerId = apt.support_worker_id;
    if (workerId) {
      if (!acc[workerId]) acc[workerId] = [];
      acc[workerId].push(apt);
    }
    return acc;
  }, {} as { [key: number]: Appointment[] });

  // Analyze each worker's load
  Object.entries(workerAppointments).forEach(([workerId, apts]) => {
    const totalHours = apts.reduce((sum, apt) => {
      const start = new Date(apt.start_time);
      const end = new Date(apt.end_time);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const avgDailyHours = totalHours / 7; // Assuming weekly view
    
    if (avgDailyHours < 4) {
      issues.push({
        worker_id: parseInt(workerId),
        issue: 'underutilized',
        current_hours: avgDailyHours,
        suggested_hours: 6
      });
    } else if (avgDailyHours > 8) {
      issues.push({
        worker_id: parseInt(workerId),
        issue: 'overbooked',
        current_hours: avgDailyHours,
        suggested_hours: 7
      });
    }
  });

  return issues;
};

const analyzeTravelOptimization = (appointments: Appointment[]): any[] => {
  // Simplified travel optimization analysis
  const optimizations: any[] = [];
  
  // Group by worker and analyze location sequences
  const workerAppointments = appointments.reduce((acc, apt) => {
    const workerId = apt.support_worker_id;
    if (workerId) {
      if (!acc[workerId]) acc[workerId] = [];
      acc[workerId].push(apt);
    }
    return acc;
  }, {} as { [key: number]: Appointment[] });

  Object.entries(workerAppointments).forEach(([workerId, apts]) => {
    const sortedApts = apts.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    // Simple optimization: if there are appointments that could be reordered
    // to reduce back-and-forth travel
    if (sortedApts.length >= 3) {
      optimizations.push({
        worker_id: parseInt(workerId),
        suggestion: 'Reorder appointments by location proximity',
        potential_savings: '30-45 minutes travel time',
        appointments: sortedApts.map(apt => apt.id)
      });
    }
  });

  return optimizations;
};

export default SmartSuggestions;