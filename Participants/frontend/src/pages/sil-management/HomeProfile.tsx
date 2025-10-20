// frontend/src/pages/sil-management/HomeProfile.tsx
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import {
  GoogleMap,
  Marker,
  useLoadScript,
} from "@react-google-maps/api"
import {
  silService,
  HomeDetailResponse,
  HomeStatsSummary,
} from "../../services/silService"
// If the file is actually named 'silService.ts' and located in 'src/services/', ensure the path is correct.
// If the file is missing, create 'src/services/silService.ts' and export the required members.

const TABS = ["overview", "rooms", "maintenance", "notes"] as const

type TabKey = typeof TABS[number]

type LatLngLiteral = { lat: number; lng: number }

const formatDate = (value?: string | null) => {
  if (!value) return "�"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

const libraries: [] = []

const HomeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>("overview")

  const [noteForm, setNoteForm] = useState({ note: "", createdBy: "", files: [] as File[] })
  const [maintenanceForm, setMaintenanceForm] = useState({
    description: "",
    priority: "Medium",
    category: "",
    assignedTo: "",
    scheduledDate: "",
    cost: "",
    notes: "",
    files: [] as File[],
  })

  const noteFileInputRef = useRef<HTMLInputElement | null>(null)
  const maintenanceFileInputRef = useRef<HTMLInputElement | null>(null)

  const homeQuery = useQuery<HomeDetailResponse, Error>({
    queryKey: ["sil", "homes", id],
    queryFn: () => silService.getHome(id ?? ""),
    enabled: Boolean(id),
  })

  const statsQuery = useQuery<HomeStatsSummary, Error>({
    queryKey: ["sil", "stats"],
    queryFn: silService.getStats,
  })

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const mapsLoaded = useLoadScript({
    googleMapsApiKey,
    libraries,
    preventGoogleFontsLoading: true,
  }).isLoaded

  const [coordinates, setCoordinates] = useState<LatLngLiteral | null>(null)
  const home = homeQuery.data

  // Delete home (inside component)
  const deleteHomeMutation = useMutation({
    mutationFn: async () => silService.deleteHome(id ?? ""),
    onSuccess: () => {
      toast.success("Home deleted")
      queryClient.invalidateQueries({ queryKey: ["sil", "homes"] })
      navigate("/sil/homes")
    },
    onError: (error: Error) => toast.error(error.message),
  })

  useEffect(() => {
    if (!mapsLoaded || !googleMapsApiKey || !home) return

    if (home.profile?.latitude && home.profile?.longitude) {
      setCoordinates({ lat: home.profile.latitude, lng: home.profile.longitude })
      return
    }

    const googleMaps = (window as any).google
    if (!googleMaps?.maps) return
    const geocoder = new googleMaps.maps.Geocoder()
    geocoder.geocode(
      { address: `${home.address}, ${home.state} ${home.postalCode}` },
      (results: any, status: string) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location
          setCoordinates({ lat: location.lat(), lng: location.lng() })
        }
      },
    )
  }, [mapsLoaded, googleMapsApiKey, home])

  const createNoteMutation = useMutation({
    mutationFn: () => silService.createNote(id ?? "", noteForm.note, noteForm.createdBy || undefined, noteForm.files),
    onSuccess: () => {
      toast.success("Note added")
      setNoteForm({ note: "", createdBy: noteForm.createdBy, files: [] })
      if (noteFileInputRef.current) noteFileInputRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const createMaintenanceMutation = useMutation({
    mutationFn: () =>
      silService.createMaintenance(
        id ?? "",
        {
          description: maintenanceForm.description,
          priority: maintenanceForm.priority,
          category: maintenanceForm.category || undefined,
          assignedTo: maintenanceForm.assignedTo || undefined,
          scheduledDate: maintenanceForm.scheduledDate || undefined,
          cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : undefined,
          notes: maintenanceForm.notes || undefined,
        },
        maintenanceForm.files,
      ),
    onSuccess: () => {
      toast.success("Maintenance request created")
      setMaintenanceForm({
        description: "",
        priority: "Medium",
        category: "",
        assignedTo: "",
        scheduledDate: "",
        cost: "",
        notes: "",
        files: [],
      })
      if (maintenanceFileInputRef.current) maintenanceFileInputRef.current.value = ""
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const roomsSummary = useMemo(() => {
    if (!home) return { occupied: 0, available: 0 }
    return home.rooms.reduce(
      (acc, room) => {
        const occupied = room.occupancyStatus?.toLowerCase() === "occupied"
        if (occupied) acc.occupied += 1
        else acc.available += 1
        return acc
      },
      { occupied: 0, available: 0 },
    )
  }, [home])

  if (homeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading home details...</p>
        </div>
      </div>
    )
  }

  if (homeQuery.isError || !home) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load home</h2>
          <p className="text-gray-600 mb-4">{homeQuery.error?.message ?? "Please try again later."}</p>
          <Link to="/sil/homes" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to homes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/sil" className="hover:text-blue-600">
                  SIL Management
                </Link>
                <span>&gt;</span>
                <Link to="/sil/homes" className="hover:text-blue-600">
                  Homes
                </Link>
                <span>&gt;</span>
                <span className="text-gray-900">{home.profile?.displayName ?? home.address}</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">{home.profile?.displayName ?? home.address}</h1>
              <p className="mt-2 text-gray-600">
                {home.address}, {home.state} {home.postalCode}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/sil/homes/${home.id}/edit`}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
              >
                Edit Home
              </Link>
              <Link
                to={`/sil/homes/${home.id}/rooms`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Manage Rooms
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (deleteHomeMutation.isPending) return
                  const sure = window.confirm(
                    "Delete this home? This action cannot be undone."
                  )
                  if (sure) deleteHomeMutation.mutate()
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                disabled={deleteHomeMutation.isPending}
                title="Delete Home"
              >
                {deleteHomeMutation.isPending ? "Deleting..." : "Delete Home"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-lg font-semibold text-gray-900">{home.status ?? "Available"}</p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-500">Rooms</p>
              <p className="text-lg font-semibold text-gray-900">
                {roomsSummary.available} available / {roomsSummary.occupied} occupied
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-500">Bathrooms</p>
              <p className="text-lg font-semibold text-gray-900">
                {home.propertyDetail?.bathrooms ?? "�"}
              </p>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <p className="text-sm text-gray-500">Pending Maintenance</p>
              <p className="text-lg font-semibold text-gray-900">
                {(home.maintenanceRequests || []).filter((item) => (item.status ?? "").toLowerCase() !== "completed").length}
              </p>
            </div>
          </div>

          {statsQuery.data && (
            <div className="bg-white shadow rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-500 mb-2">Portfolio Snapshot</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
                <div>Total Homes: {statsQuery.data.totalHomes}</div>
                <div>Available Rooms: {statsQuery.data.availableRooms}</div>
                <div>Occupied Rooms: {statsQuery.data.occupiedRooms}</div>
                <div>Open Maintenance: {statsQuery.data.pendingMaintenance}</div>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200 px-6">
              <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 text-sm font-medium ${
                      activeTab === tab
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <section className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Property Details</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <dt className="text-gray-500">Property Type</dt>
                          <dd className="font-medium text-gray-900">{home.propertyType}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">SDA Type</dt>
                          <dd className="font-medium text-gray-900">{home.sdaType ?? "�"}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Rooms</dt>
                          <dd className="font-medium text-gray-900">{home.propertyDetail?.totalRooms ?? "�"}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Kitchens</dt>
                          <dd className="font-medium text-gray-900">{home.propertyDetail?.kitchens ?? "�"}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Parking Spaces</dt>
                          <dd className="font-medium text-gray-900">{home.propertyDetail?.parkingSpaces ?? "�"}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">Assigned Manager</dt>
                          <dd className="font-medium text-gray-900">{home.profile?.assignedManager ?? "Unassigned"}</dd>
                        </div>
                      </dl>
                      {home.description && (
                        <div className="mt-4">
                          <dt className="text-gray-500 mb-1">Description</dt>
                          <dd className="text-gray-700 text-sm leading-6">{home.description}</dd>
                        </div>
                      )}
                    </section>

                    <section className="border border-gray-200 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Shared Spaces & Features</h3>
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Shared Spaces</h4>
                        <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                          {home.sharedSpaces.length > 0 ? (
                            home.sharedSpaces.map((space) => <li key={space.name}>{space.name}</li>)
                          ) : (
                            <li>No shared spaces recorded</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Features</h4>
                        <div className="flex flex-wrap gap-2">
                          {home.features.length > 0 ? (
                            home.features.map((feature) => (
                              <span
                                key={feature.featureName}
                                className={`px-3 py-1 text-xs rounded-full ${
                                  feature.isAvailable
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {feature.featureName}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">No features recorded</span>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4 h-full">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Location</h3>
                    {googleMapsApiKey ? (
                      <div className="h-64 rounded-lg overflow-hidden">
                        {mapsLoaded && coordinates ? (
                          <GoogleMap
                            mapContainerStyle={{ width: "100%", height: "100%" }}
                            center={coordinates}
                            zoom={14}
                          >
                            <Marker position={coordinates} />
                          </GoogleMap>
                        ) : (
                          <div className="h-full flex items-center justify-center text-sm text-gray-500">
                            Loading map...
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Google Maps API key not configured. Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in your .env to display the map.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "rooms" && (
                <div className="space-y-4">
                  {home.rooms.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 border border-dashed border-gray-300 rounded-lg">
                      No rooms configured yet. Use the Manage Rooms button to start adding rooms.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {home.rooms.map((room) => (
                        <div key={room.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{room.detail?.name ?? `Room ${room.id}`}</h4>
                              <p className="text-sm text-gray-600">{room.bedType}</p>
                            </div>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                (room.occupancyStatus ?? "").toLowerCase() === "occupied"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {room.occupancyStatus ?? "Vacant"}
                            </span>
                          </div>
                          <dl className="text-sm text-gray-700 space-y-1">
                            <div>
                              <span className="text-gray-500">Rent: </span>
                              <span className="font-medium">
                                ${room.rentAmount} / {room.rentFrequency.toLowerCase()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Ensuite: </span>
                              <span className="font-medium">{room.ensuite ? "Yes" : "No"}</span>
                            </div>
                            {room.detail?.doorWidth && (
                              <div>
                                <span className="text-gray-500">Door Width: </span>
                                <span className="font-medium">{room.detail.doorWidth}</span>
                              </div>
                            )}
                            {room.detail?.description && (
                              <div>
                                <span className="text-gray-500">Description: </span>
                                <span className="font-medium">{room.detail.description}</span>
                              </div>
                            )}
                          </dl>
                          {room.occupancies.length > 0 && (
                            <div className="mt-3">
                              <h5 className="text-sm font-semibold text-gray-700 mb-1">Occupancy History</h5>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {room.occupancies.map((occ) => (
                                  <li key={occ.id}>
                                    {occ.participant
                                      ? `${occ.participant.firstName ?? ""} ${occ.participant.lastName ?? ""}`.trim()
                                      : `Participant #${occ.participantId}`}
                                    : {formatDate(occ.moveInDate)} ? {formatDate(occ.moveOutDate)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "maintenance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Create Maintenance Request</h3>
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!maintenanceForm.description.trim()) {
                          toast.error("Please provide a description")
                          return
                        }
                        createMaintenanceMutation.mutate()
                      }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={maintenanceForm.description}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={maintenanceForm.priority}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, priority: e.target.value }))}
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
                            value={maintenanceForm.category}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, category: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={maintenanceForm.assignedTo}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                          <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={maintenanceForm.scheduledDate}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={maintenanceForm.cost}
                            onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, cost: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={maintenanceForm.notes}
                          onChange={(e) => setMaintenanceForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                        <input
                          type="file"
                          multiple
                          ref={maintenanceFileInputRef}
                          onChange={(e) =>
                            setMaintenanceForm((prev) => ({
                              ...prev,
                              files: Array.from(e.target.files ?? []),
                            }))
                          }
                        />
                      </div>

                      <div className="flex justify-end">
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

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h3>
                    {home.maintenanceRequests.length === 0 ? (
                      <p className="text-sm text-gray-600">No maintenance records yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {home.maintenanceRequests.map((item) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{item.description}</h4>
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                {item.status ?? "Open"}
                              </span>
                            </div>
                            <dl className="text-sm text-gray-700 space-y-1">
                              {item.assignedTo && (
                                <div>
                                  <span className="text-gray-500">Assigned To: </span>
                                  <span className="font-medium">{item.assignedTo}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Priority: </span>
                                <span className="font-medium">{item.priority ?? "Medium"}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Scheduled: </span>
                                <span className="font-medium">{formatDate(item.scheduledDate)}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Completed: </span>
                                <span className="font-medium">{formatDate(item.completedDate)}</span>
                              </div>
                              {item.cost !== undefined && item.cost !== null && (
                                <div>
                                  <span className="text-gray-500">Cost: </span>
                                  <span className="font-medium">${item.cost.toFixed(2)}</span>
                                </div>
                              )}
                              {item.notes && (
                                <div>
                                  <span className="text-gray-500">Notes: </span>
                                  <span className="font-medium">{item.notes}</span>
                                </div>
                              )}
                            </dl>
                            {item.attachments.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Attachments</h5>
                                <ul className="text-sm text-blue-600 space-y-1">
                                  {item.attachments.map((attachment) => (
                                    <li key={attachment.id}>
                                      <a href={attachment.url ?? "#"} target="_blank" rel="noreferrer" className="hover:underline">
                                        {attachment.fileName}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "notes" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Add Staff Note</h3>
                    <form
                      className="space-y-4"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!noteForm.note.trim()) {
                          toast.error("Please write a note")
                          return
                        }
                        createNoteMutation.mutate()
                      }}
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Note *</label>
                        <textarea
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={noteForm.note}
                          onChange={(e) => setNoteForm((prev) => ({ ...prev, note: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                          <input
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={noteForm.createdBy}
                            onChange={(e) => setNoteForm((prev) => ({ ...prev, createdBy: e.target.value }))}
                            placeholder="e.g. Kajal"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
                          <input
                            type="file"
                            multiple
                            ref={noteFileInputRef}
                            onChange={(e) =>
                              setNoteForm((prev) => ({
                                ...prev,
                                files: Array.from(e.target.files ?? []),
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={createNoteMutation.isPending}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                        >
                          {createNoteMutation.isPending ? "Saving..." : "Add Note"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Notes History</h3>
                    {home.notes.length === 0 ? (
                      <p className="text-sm text-gray-600">No notes recorded yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {home.notes.map((note) => (
                          <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{note.createdBy}</h4>
                              <span className="text-xs rounded-full" style={{ backgroundColor: "#f0f0f0", paddingLeft: "0.5rem", paddingRight: "0.5rem", paddingTop: "0.125rem", paddingBottom: "0.125rem" }}>
                                {formatDate(note.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm leading-6">{note.note}</p>
                            {note.attachments && note.attachments.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-semibold text-gray-700 mb-1">Attachments</h5>
                                <ul className="text-sm text-blue-600 space-y-1">
                                  {note.attachments.map((attachment) => (
  <li key={String(attachment.id)}>
    <a
      href={attachment.url ?? "#"}
      target="_blank"
      rel="noreferrer"
      className="hover:underline"
    >
      {attachment.fileName}
    </a>
  </li>
))}

                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomeProfile

// Add this TypeScript declaration at the top (after imports) to fix import.meta.env error:
declare global {
  interface ImportMeta {
    env: {
      VITE_API_URL: string
      VITE_GOOGLE_MAPS_API_KEY: string;
      // ...other env vars...
    };
  }
}
