// frontend/src/pages/sil-management/MaintenanceOverview.tsx
import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { silService, HomeSummaryResponse, MaintenanceResponseData } from '../../services/silService'

const MaintenanceOverview: React.FC = () => {
  const [search, setSearch] = useState('')

  const homesQuery = useQuery<HomeSummaryResponse[], Error>({
    queryKey: ['sil', 'homes'],
    queryFn: silService.getHomes,
  })

  const overviewQuery = useQuery<any, Error>({
    queryKey: ['sil', 'maintenance', 'overview', search],
    queryFn: () => silService.getMaintenanceOverview(search || undefined),
  })

  const underMaintenanceHomes = useMemo(() => {
    const list = homesQuery.data || []
    const s = search.trim().toLowerCase()
    return list.filter(h => {
      const isMaint = (h.status || '').toLowerCase() === 'maintenance'
      if (!isMaint) return false
      if (!s) return true
      return (
        h.displayName.toLowerCase().includes(s) ||
        h.address.toLowerCase().includes(s) ||
        h.postalCode.toLowerCase().includes(s)
      )
    })
  }, [homesQuery.data, search])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Maintenance Overview</h1>
              <p className="mt-2 text-gray-600">Track active and scheduled maintenance across all homes</p>
            </div>
            <div className="md:w-96 w-full">
              <input
                type="text"
                placeholder="Search homes or requests..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Under Maintenance Homes */}
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Homes Under Maintenance</h2>
              <p className="text-sm text-gray-600">Homes marked with status "Maintenance"</p>
            </div>
            {homesQuery.isLoading ? (
              <div className="p-6 text-sm text-gray-600">Loading homes...</div>
            ) : underMaintenanceHomes.length === 0 ? (
              <div className="p-6 text-sm text-gray-600">No homes currently marked for maintenance.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {underMaintenanceHomes.map((h) => (
                  <li key={h.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{h.displayName}</div>
                      <div className="text-sm text-gray-600">{h.address}, {h.state} {h.postalCode}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Maintenance</span>
                      <Link to={`/sil/homes/${h.id}/maintenance`} className="text-blue-600 hover:underline text-sm">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Active Maintenance Requests */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Active Maintenance Requests</h2>
              <p className="text-sm text-gray-600">Open or In Progress requests by home</p>
            </div>
            {overviewQuery.isLoading ? (
              <div className="p-6 text-sm text-gray-600">Loading maintenance...</div>
            ) : overviewQuery.isError ? (
              <div className="p-6 text-sm text-red-600">Failed to load maintenance overview.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {(overviewQuery.data || []).map((item: any) => (
                  <li key={item.home.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.home.displayName}</div>
                        <div className="text-sm text-gray-600">{item.home.address}, {item.home.state} {item.home.postalCode}</div>
                        <div className="mt-2 text-sm text-gray-700">
                          <span className="mr-4">Open: <span className="font-semibold">{item.openRequests}</span></span>
                          <span>In Progress: <span className="font-semibold">{item.inProgressRequests}</span></span>
                        </div>
                        {item.latestRequests?.length ? (
                          <ul className="mt-3 space-y-2">
                            {item.latestRequests.map((r: MaintenanceResponseData) => (
                              <li key={r.id} className="text-sm">
                                <span className="font-medium text-gray-900">{r.description}</span>
                                <span className="ml-2 text-gray-600">[{r.status ?? 'Open'} • {r.priority ?? 'Medium'}]</span>
                                {r.assignedTo && (
                                  <span className="ml-2 text-gray-600">→ {r.assignedTo}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                      <Link to={`/sil/homes/${item.home.id}/maintenance`} className="text-blue-600 hover:underline text-sm">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceOverview

