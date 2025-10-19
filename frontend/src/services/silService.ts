const API_BASE_URL = import.meta.env.VITE_API_URL + '/api/v1' || 'http://localhost:8000/api/v1';
const ADMIN_API_KEY = 'admin-development-key-123'; // From your .env file

export interface Attachment {
  id: number;
  fileName: string;
  objectKey: string;
  url?: string;
  contentType?: string;
  fileSize?: number;
  createdAt?: string;
}

export interface HomeSummaryResponse {
  id: number;
  displayName: string;
  address: string;
  state: string;
  postalCode: string;
  propertyType: string;
  sdaType?: string;
  status?: string;
  assignedManager?: string;
  roomsTotal: number;
  roomsAvailable: number;
  bathrooms: number;
  updatedAt?: string;
}

export interface HomeProfilePayload {
  displayName: string;
  assignedManager?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface HomePropertyDetailPayload {
  totalRooms: number;
  bathrooms: number;
  kitchens: number;
  parkingSpaces: number;
}

export interface HomeFeaturePayload {
  featureName: string;
  isAvailable: boolean;
}

export interface HomeSharedSpacePayload {
  name: string;
}

export interface HomeFormPayload {
  home: {
    address: string;
    state: string;
    postalCode: string;
    propertyType: string;
    sdaType?: string;
    status?: string;
    description?: string;
  };
  profile: HomeProfilePayload;
  propertyDetail: HomePropertyDetailPayload;
  sharedSpaces: HomeSharedSpacePayload[];
  features: HomeFeaturePayload[];
}

export interface RoomDetailPayload {
  name: string;
  bedHeight?: string;
  sofas?: number;
  cupboard?: boolean;
  tv?: boolean;
  tables?: number;
  doorWidth?: string;
  description?: string;
}

export interface RoomPayload {
  bedType: string;
  rentAmount: number;
  rentFrequency: string;
  ensuite?: boolean;
  furnishings?: string;
  occupancyStatus?: string;
  detail: RoomDetailPayload;
}

export interface ParticipantSummary {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface OccupancyPayload {
  participantId: number;
  moveInDate: string;
  moveOutDate?: string | null;
}

export interface OccupancyResponse extends OccupancyPayload {
  id: number;
  participant?: ParticipantSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomResponseData extends RoomPayload {
  id: number;
  homeId: number;
  images: Attachment[];
  occupancies: OccupancyResponse[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenancePayload {
  description: string;
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  scheduledDate?: string | null;
  completedDate?: string | null;
  cost?: number | null;
  notes?: string | null;
}

export interface MaintenanceResponseData extends MaintenancePayload {
  id: number;
  homeId: number;
  attachments: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NoteResponseData {
  id: number;
  homeId: number;
  note: string;
  createdBy?: string;
  attachments: Attachment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeDetailResponse {
  id: number;
  address: string;
  state: string;
  postalCode: string;
  propertyType: string;
  sdaType?: string;
  status?: string;
  description?: string;
  profile?: HomeProfilePayload & { createdAt?: string; updatedAt?: string };
  propertyDetail?: HomePropertyDetailPayload & {
    createdAt?: string;
    updatedAt?: string;
  };
  sharedSpaces: HomeSharedSpacePayload[];
  features: HomeFeaturePayload[];
  rooms: RoomResponseData[];
  notes: NoteResponseData[];
  maintenanceRequests: MaintenanceResponseData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeStatsSummary {
  totalHomes: number;
  availableRooms: number;
  occupiedRooms: number;
  pendingMaintenance: number;
}

const base = `${API_BASE_URL.replace(/\/$/, "")}/sil`;

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((item: any) => item.msg || item).join(", ")
          : data.detail;
      }
    } catch (err) {
      // ignore json parse error
    }
    throw new Error(message);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const silService = {
  async getHomes(): Promise<HomeSummaryResponse[]> {
    const res = await fetch(`${base}/homes`);
    return handleResponse(res);
  },

  async getHome(homeId: number | string): Promise<HomeDetailResponse> {
    const res = await fetch(`${base}/homes/${homeId}`);
    return handleResponse(res);
  },

  async createHome(payload: HomeFormPayload): Promise<HomeDetailResponse> {
    const res = await fetch(`${base}/homes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateHome(
    homeId: number | string,
    payload: HomeFormPayload,
  ): Promise<HomeDetailResponse> {
    const res = await fetch(`${base}/homes/${homeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteHome(homeId: number | string): Promise<void> {
    const res = await fetch(`${base}/homes/${homeId}`, { method: "DELETE" });
    await handleResponse(res);
  },

  async getRooms(homeId: number | string): Promise<RoomResponseData[]> {
    const res = await fetch(`${base}/homes/${homeId}/rooms`);
    return handleResponse(res);
  },

  async createRoom(
    homeId: number | string,
    payload: RoomPayload,
  ): Promise<RoomResponseData> {
    const res = await fetch(`${base}/homes/${homeId}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateRoom(
    roomId: number | string,
    payload: RoomPayload,
  ): Promise<RoomResponseData> {
    const res = await fetch(`${base}/rooms/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteRoom(roomId: number | string): Promise<void> {
    const res = await fetch(`${base}/rooms/${roomId}`, { method: "DELETE" });
    await handleResponse(res);
  },

  async uploadRoomImage(
    roomId: number | string,
    file: File,
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${base}/rooms/${roomId}/images`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  async assignOccupancy(
    roomId: number | string,
    payload: OccupancyPayload,
  ): Promise<OccupancyResponse> {
    const res = await fetch(`${base}/rooms/${roomId}/occupancies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateOccupancy(
    occupancyId: number | string,
    payload: OccupancyPayload,
  ): Promise<OccupancyResponse> {
    const res = await fetch(`${base}/occupancies/${occupancyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async createMaintenance(
    homeId: number | string,
    payload: MaintenancePayload,
    files: File[] = [],
  ): Promise<MaintenanceResponseData> {
    const formData = new FormData();
    formData.append("description", payload.description);
    formData.append("status", payload.status ?? "Open");
    formData.append("priority", payload.priority ?? "Medium");
    if (payload.category) formData.append("category", payload.category);
    if (payload.assignedTo) formData.append("assignedTo", payload.assignedTo);
    if (payload.scheduledDate)
      formData.append("scheduledDate", payload.scheduledDate);
    if (payload.completedDate)
      formData.append("completedDate", payload.completedDate);
    if (payload.cost !== undefined && payload.cost !== null) {
      formData.append("cost", String(payload.cost));
    }
    if (payload.notes) formData.append("notes", payload.notes);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${base}/homes/${homeId}/maintenance`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  async updateMaintenance(
    requestId: number | string,
    payload: MaintenancePayload,
  ): Promise<MaintenanceResponseData> {
    const res = await fetch(`${base}/maintenance/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async getMaintenance(
    homeId: number | string,
  ): Promise<MaintenanceResponseData[]> {
    const res = await fetch(`${base}/homes/${homeId}/maintenance`);
    return handleResponse(res);
  },

  async searchMaintenance(params: {
    q?: string;
    status?: string;
    priority?: string;
    homeId?: number | string;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<MaintenanceResponseData[]> {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length > 0) qs.append(k, String(v));
    });
    const url = `${base}/maintenance/search${qs.toString() ? `?${qs.toString()}` : ''}`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async getMaintenanceOverview(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${base}/maintenance/overview${qs}`);
    return handleResponse<any>(res);
  },

  async getMaintenanceAudits(requestId: number | string) {
    const res = await fetch(`${base}/maintenance/${requestId}/audits`);
    return handleResponse<any[]>(res);
  },

  async createPreventiveSchedule(homeId: number | string, payload: {
    description: string;
    frequency: string;
    intervalDays?: number;
    assignedTo?: string;
    category?: string;
    estimatedCost?: number;
    nextDueDate: string;
    active?: boolean;
  }) {
    const res = await fetch(`${base}/homes/${homeId}/preventive-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async listPreventiveSchedules(homeId: number | string) {
    const res = await fetch(`${base}/homes/${homeId}/preventive-schedules`);
    return handleResponse<any[]>(res);
  },

  async generateFromSchedule(scheduleId: number | string) {
    const res = await fetch(`${base}/preventive-schedules/${scheduleId}/generate`, { method: 'POST' });
    return handleResponse<MaintenanceResponseData>(res);
  },

  async getMaintenanceReport() {
    const res = await fetch(`${base}/maintenance/report`);
    return handleResponse<any>(res);
  },

  async createNote(
    homeId: number | string,
    note: string,
    createdBy?: string,
    files: File[] = [],
  ): Promise<NoteResponseData> {
    const formData = new FormData();
    formData.append("note", note);
    if (createdBy) formData.append("createdBy", createdBy);
    files.forEach((file) => formData.append("files", file));

    const res = await fetch(`${base}/homes/${homeId}/notes`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  async getNotes(homeId: number | string): Promise<NoteResponseData[]> {
    const res = await fetch(`${base}/homes/${homeId}/notes`);
    return handleResponse(res);
  },

  async getStats(): Promise<HomeStatsSummary> {
    const res = await fetch(`${base}/homes/summary/stats`);
    return handleResponse(res);
  },
};
