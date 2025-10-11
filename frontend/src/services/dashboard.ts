import { withAuth } from "./auth";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

type HeaderMap = Record<string, string>;

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = withAuth((options.headers as HeaderMap) || {});
  const response = await fetch(`${API}${path}`, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
};

export interface ManagerStats {
  awaitingSignoff: number;
  approvedToday: number;
  rejectedToday: number;
  readyToConvert: number;
}

export interface ManagerQueueItem {
  participant_id: number;
  participant_name: string;
  manager_review_status: string;
  updated_at: string | null;
}

export interface RecentlyOnboardedRow {
  participant_id: number;
  participant: string;
  date: string | null;
  manager: string | null;
}

export interface ProviderSummary {
  prospective: number;
  plans_ready: number;
  quotes_awaiting: number;
  documents_missing: number;
  ready_to_onboard: number;
}

export interface ProviderParticipantRow {
  participantId: number;
  name: string;
  stage: string;
  participantStatus: string;
  careStatus: string;
  riskStatus: string;
  quotationStatus: string;
  documentsStatus: string;
  missingDocsCount: number;
  lastUpdated: string | null;
}

export interface ParticipantDashboardResponse {
  participant: {
    id: number;
    name: string;
    status: string;
    onboarding_completed: boolean;
    care_plan_completed: boolean;
  };
  stats: {
    onboardingStatus: string;
    signedDocuments: number;
    upcomingAppointments: number;
    outstandingActions: number;
  };
  documentStats: Record<string, unknown>;
  documents: Array<{
    id: number;
    name: string;
    status: string | null;
    created_at: string | null;
  }>;
  appointments: Array<{
    id: number;
    date: string;
    time: string;
    serviceType: string;
    status: string;
  }>;
}

export interface WorkerDashboardResponse {
  stats: {
    shiftsToday: number;
    hoursThisWeek: number;
    participantsAssigned: number;
    openTasks: number;
  };
  todayShifts: Array<{
    id: number;
    time: string;
    participants: string;
    notes: string | null;
    status: string;
  }>;
  participants: Array<{
    participantId: number;
    name: string;
    nextAppointment: string;
  }>;
}

export const dashboardAPI = {
  getManagerStats: () => request<ManagerStats>("/care/manager/stats"),
  getManagerQueue: () => request<ManagerQueueItem[]>("/care/manager/reviews"),
  getRecentlyOnboarded: (days = 7) =>
    request<RecentlyOnboardedRow[]>(`/dashboards/manager/recently-onboarded?days=${days}`),
  managerApprove: (participantId: number) =>
    request(`/care/participants/${participantId}/manager-approve`, {
      method: "POST",
    }),
  managerReject: (participantId: number) =>
    request(`/care/participants/${participantId}/manager-reject`, {
      method: "POST",
    }),
  getProviderSummary: () => request<ProviderSummary>("/dashboards/provider/summary"),
  getProviderParticipants: () => request<ProviderParticipantRow[]>("/dashboards/provider/participants"),
  getParticipantDashboard: (participantId: number) =>
    request<ParticipantDashboardResponse>(`/dashboards/participant/${participantId}`),
  getWorkerDashboard: (workerId: number) =>
    request<WorkerDashboardResponse>(`/dashboards/worker/${workerId}`),
};
