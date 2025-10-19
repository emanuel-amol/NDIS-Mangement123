// frontend/src/pages/sil-management/MaintenanceHistory.tsx
import React, { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import {
  silService,
  HomeDetailResponse,
  MaintenanceResponseData,
} from "../../services/silService"

const statusFilters = ["All", "Open", "In Progress", "Completed", "Cancelled"]
const priorityFilters = ["All", "Low", "Medium", "High", "Urgent"]

const MaintenanceHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    priority: "All",
  })

  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    description: "",
    priority: "Medium",
    category: "",
    assignedTo: "",
    scheduledDate: "",
    cost: "",
    notes: "",
    files: [] as File[],
  })

  const homeQuery = useQuery<HomeDetailResponse, Error>({
    queryKey: ["sil", "homes", id],
    queryFn: () => silService.getHome(id ?? ""),
    enabled: Boolean(id),
  })

  const maintenanceQuery = useQuery<MaintenanceResponseData[], Error>({
    queryKey: ["sil", "homes", id, "maintenance"],
    queryFn: () => silService.getMaintenance(id ?? ""),
    enabled: Boolean(id),
  })

  // Audit trail state per request
  const [auditState, setAuditState] = useState<Record<number, { open: boolean; loading: boolean; items: any[] }>>({})
  const toggleAudit = async (requestId: number) => {
    const current = auditState[requestId]
    if (current?.open) {
      setAuditState((s) => ({ ...s, [requestId]: { ...current, open: false } }))
      return
    }
    // open and load if not loaded
    setAuditState((s) => ({ ...s, [requestId]: { open: true, loading: true, items: current?.items || [] } }))
    try {
      const items = await silService.getMaintenanceAudits(requestId)
      setAuditState((s) => ({ ...s, [requestId]: { open: true, loading: false, items } }))
    } catch (e) {
      setAuditState((s) => ({ ...s, [requestId]: { open: true, loading: false, items: current?.items || [] } }))
    }
  }

  // Preventive schedules
  const schedulesQuery = useQuery<any[], Error>({
    queryKey: ["sil", "homes", id, "preventive-schedules"],
    queryFn: () => silService.listPreventiveSchedules(id ?? ""),
    enabled: Boolean(id),
  })
  const [scheduleForm, setScheduleForm] = useState({
    description: "",
    frequency: "Monthly",
    intervalDays: "",
    assignedTo: "",
    category: "",
    estimatedCost: "",
    nextDueDate: "",
  })
  const createScheduleMutation = useMutation({
    mutationFn: () =>
      silService.createPreventiveSchedule(id ?? "", {
        description: scheduleForm.description,
        frequency: scheduleForm.frequency,
        intervalDays: scheduleForm.intervalDays ? Number(scheduleForm.intervalDays) : undefined,
        assignedTo: scheduleForm.assignedTo || undefined,
        category: scheduleForm.category || undefined,
        estimatedCost: scheduleForm.estimatedCost ? Number(scheduleForm.estimatedCost) : undefined,
        nextDueDate: scheduleForm.nextDueDate,
        active: true,
      }),
    onSuccess: () => {
      toast.success("Preventive schedule added")
      setScheduleForm({ description: "", frequency: "Monthly", intervalDays: "", assignedTo: "", category: "", estimatedCost: "", nextDueDate: "" })
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id, "preventive-schedules"] })
    },
    onError: (e: Error) => toast.error(e.message),
  })
  const generateFromSchedule = async (scheduleId: number) => {
    try {
      await silService.generateFromSchedule(scheduleId)
      toast.success("Generated maintenance request")
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id, "maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id, "preventive-schedules"] })
    } catch (e: any) {
      toast.error(e.message || "Failed to generate request")
    }
  }

  const createMaintenanceMutation = useMutation({
    mutationFn: () =>
      silService.createMaintenance(
        id ?? "",
        {
          description: formData.description,
          priority: formData.priority,
          category: formData.category || undefined,
          assignedTo: formData.assignedTo || undefined,
          scheduledDate: formData.scheduledDate || undefined,
          cost: formData.cost ? Number(formData.cost) : undefined,
          notes: formData.notes || undefined,
        },
        formData.files,
      ),
    onSuccess: () => {
      toast.success("Maintenance request created")
      setShowAddModal(false)
      setFormData({
        description: "",
        priority: "Medium",
        category: "",
        assignedTo: "",
        scheduledDate: "",
        cost: "",
        notes: "",
        files: [],
      })
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id, "maintenance"] })
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const filteredMaintenance = useMemo(() => {
    if (!maintenanceQuery.data) return []
    return maintenanceQuery.data.filter((item) => {
      const term = filters.search.trim().toLowerCase()
      const matchesSearch =
        !term ||
        item.description.toLowerCase().includes(term) ||
        (item.assignedTo ?? "").toLowerCase().includes(term) ||
        (item.category ?? "").toLowerCase().includes(term)

      const matchesStatus = filters.status === "All" || (item.status ?? "Open") === filters.status
      const matchesPriority = filters.priority === "All" || (item.priority ?? "Medium") === filters.priority

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [maintenanceQuery.data, filters])

  const home = homeQuery.data

  if (maintenanceQuery.isLoading || homeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading maintenance history...</p>
        </div>
      </div>
    )
  }

  if (maintenanceQuery.isError || !home) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load maintenance records</h2>
          <p className="text-gray-600 mb-4">{maintenanceQuery.error?.message ?? "Please try again later."}</p>
          <Link to={`/sil/homes/${id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  const handleModalSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.description.trim()) {
      toast.error("Description is required")
      return
    }
    createMaintenanceMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/sil" className="hover:text-blue-600">SIL Management</Link>
                <span>&gt;</span>
                <Link to="/sil/homes" className="hover:text-blue-600">Homes</Link>
                <span>&gt;</span>
                <Link to={`/sil/homes/${home.id}`} className="hover:text-blue-600">
                  {home.profile?.displayName ?? home.address}
                </Link>
                <span>&gt;</span>
                <span className="text-gray-900">Maintenance</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance History</h1>
              <p className="mt-2 text-gray-600">Track maintenance requests, priorities, and attachments for this home.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Maintenance Request
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search descriptions, contractors or categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {statusFilters.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={filters.priority}
                  onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  {priorityFilters.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white shadow rounded-lg">
            {filteredMaintenance.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No maintenance records match your filters.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredMaintenance.map((item) => (
                  <li key={item.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.description}</h3>
                        <div className="mt-1 text-sm text-gray-600 space-x-3">
                          <span>Status: <span className="font-medium text-gray-800">{item.status ?? "Open"}</span></span>
                          <span>Priority: <span className="font-medium text-gray-800">{item.priority ?? "Medium"}</span></span>
                          {item.assignedTo && (
                            <span>Assigned: <span className="font-medium text-gray-800">{item.assignedTo}</span></span>
                          )}
                          {item.scheduledDate && (
                            <span>Scheduled: <span className="font-medium text-gray-800">{item.scheduledDate}</span></span>
                          )}
                          {item.cost != null && (
                            <span>Cost: <span className="font-medium text-gray-800">${Number(item.cost).toFixed(2)}</span></span>
                          )}
                        </div>
                        {item.notes && <p className="mt-2 text-sm text-gray-700">{item.notes}</p>}
                        {item.attachments?.length ? (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Attachments</p>
                            <ul className="text-sm text-blue-600 space-y-1 mt-1">
                              {item.attachments.map((a) => (
                                <li key={String(a.id)}>
                                  <a href={a.url ?? "#"} target="_blank" rel="noreferrer" className="hover:underline">
                                    {a.fileName}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {/* Audit trail */}
                        <div className="mt-2">
                          <button
                            onClick={() => toggleAudit(item.id)}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {auditState[item.id]?.open ? 'Hide Audit Trail' : 'View Audit Trail'}
                          </button>
                          {auditState[item.id]?.open && (
                            <div className="mt-2 text-sm text-gray-700">
                              {auditState[item.id]?.loading ? (
                                <div>Loading audits...</div>
                              ) : (auditState[item.id]?.items || []).length === 0 ? (
                                <div>No audit entries.</div>
                              ) : (
                                <ul className="space-y-1">
                                  {(auditState[item.id]?.items || []).map((a: any) => (
                                    <li key={a.id}>
                                      <span className="font-medium">{a.action}</span>
                                      {a.fromStatus || a.toStatus ? (
                                        <span className="ml-2 text-gray-600">[{a.fromStatus ?? '-'} → {a.toStatus ?? '-'}]</span>
                                      ) : null}
                                      {a.changedBy && <span className="ml-2">by {a.changedBy}</span>}
                                      {a.createdAt && <span className="ml-2">on {new Date(a.createdAt).toLocaleString()}</span>}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                        {item.category ?? "General"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preventive Schedules */}
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Preventive Maintenance Schedules</h3>
              <p className="text-sm text-gray-600">Create recurring schedules and generate tasks</p>
            </div>
            <div className="p-4">
              <form
                onSubmit={(e) => { e.preventDefault(); createScheduleMutation.mutate(); }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4"
              >
                <input
                  type="text"
                  placeholder="Description"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, description: e.target.value }))}
                  required
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.frequency}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, frequency: e.target.value }))}
                >
                  <option>Monthly</option>
                  <option>Quarterly</option>
                  <option>SemiAnnual</option>
                  <option>Annual</option>
                  <option>CustomDays</option>
                </select>
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.nextDueDate}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, nextDueDate: e.target.value }))}
                  required
                />
                <input
                  type="number"
                  placeholder="Interval days (custom)"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.intervalDays}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, intervalDays: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Assigned to"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.assignedTo}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, assignedTo: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Category"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.category}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, category: e.target.value }))}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Estimated cost"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={scheduleForm.estimatedCost}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, estimatedCost: e.target.value }))}
                />
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    disabled={createScheduleMutation.isPending}
                  >
                    {createScheduleMutation.isPending ? 'Saving...' : 'Add Schedule'}
                  </button>
                </div>
              </form>

              {schedulesQuery.isLoading ? (
                <div className="text-sm text-gray-600">Loading schedules...</div>
              ) : (schedulesQuery.data || []).length === 0 ? (
                <div className="text-sm text-gray-600">No schedules yet.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {(schedulesQuery.data || []).map((s: any) => (
                    <li key={s.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{s.description}</div>
                        <div className="text-sm text-gray-600">{s.frequency} • Next due: {s.nextDueDate}</div>
                      </div>
                      <button
                        onClick={() => generateFromSchedule(s.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >Generate Task</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Add Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">New Maintenance Request</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>
                <form className="space-y-4" onSubmit={handleModalSubmit}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.description}
                      onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.priority}
                        onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.category}
                        onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.assignedTo}
                        onChange={(e) => setFormData((p) => ({ ...p, assignedTo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData((p) => ({ ...p, scheduledDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        value={formData.cost}
                        onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={formData.notes}
                      onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                    <input
                      type="file"
                      multiple
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          files: Array.from(e.target.files ?? []),
                        }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createMaintenanceMutation.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      {createMaintenanceMutation.isPending ? "Saving..." : "Create Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MaintenanceHistory
