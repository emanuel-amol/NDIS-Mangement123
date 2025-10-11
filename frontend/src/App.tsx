// frontend/src/App.tsx - COMPLETE UNIFIED VERSION WITH ADMIN AND USER MANAGEMENT ROUTES
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

// Main Application Components
import Layout from './components/Layout'
import Home from './pages/main-application/Home'
import Login from './pages/main-application/Login'
import Register from './pages/main-application/Register'
import UnauthorizedPage from './pages/main-application/Unauthorized'

// Referral Components
import NDISReferralForm from './pages/referral/ReferralForm'
import ReferralManagement from './pages/referral/ReferralManagement'
import ReferralValidate from './pages/referral/ReferralValidate'

// Participant Management Components
import Participants from './pages/participant-management/participants'
import ParticipantProfile from './pages/participant-management/ParticipantProfile'
import ParticipantEdit from './pages/participant-management/ParticipantEdit'
import ParticipantNew from './pages/participant-management/ParticipantNew'

// Prospective Participant Components
import ProspectiveDashboard from './pages/prospective-participant/ProspectiveDashboard'

// Care workflow components - CRITICAL FOR ONBOARDING CONVERSION
import CareSetup from './pages/care-workflow/CareSetup'
import CarePlanEditor from './pages/care-workflow/CarePlanEditor'
import RiskAssessmentEditor from './pages/care-workflow/RiskAssessmentEditor'
import CareSignoff from './pages/care-workflow/CareSignOff'  // KEY: Sign-off page for onboarding conversion
import AICarePage from './pages/care-workflow/AICarePage'  // NEW: AI Care Assistant page
import ManagerReviewQueue from './pages/care-workflow/ManagerReviewQueue'

// Enhanced Document management components
import Documents from './pages/documents/Documents'
import ParticipantDocuments from './pages/documents/ParticipantDocuments'
import DocumentViewer from './pages/documents/DocumentViewer'
import { DocumentGenerationPage } from './components/documents/DocumentGeneration'

// Quotation Management Components - NEW
import QuotationsList from './pages/quotations/QuotationsList'
import QuotationManagement from './pages/quotations/QuotationManagement'
import QuotationDetail from './pages/quotations/QuotationDetail'

// Scheduling Components
import SchedulingDashboard from './pages/scheduling/SchedulingDashboard'
import CalendarView from './pages/scheduling/CalendarView'
import NewAppointment from './pages/scheduling/NewAppointment'
import EditAppointment from './pages/scheduling/EditAppointment'
import AppointmentDetail from './pages/scheduling/AppointmentDetail'
import RosterManagement from './pages/scheduling/RosterManagement'
import ParticipantToSchedulingWorkflow from './pages/scheduling/ParticipantToSchedulingWorkflow'

// Invoicing components
import InvoicingDashboard from './pages/invoicing/InvoicingDashboard'
import InvoiceDetail from './pages/invoicing/InvoiceDetail'
import InvoiceEdit from './pages/invoicing/InvoiceEdit'
import InvoiceGeneration from './pages/invoicing/InvoiceGeneration'
import PaymentTracking from './pages/invoicing/PaymentTracking'
import XeroSync from './pages/invoicing/XeroSync'
import RoleRoute from './components/RoleRoute'
import ProviderDashboard from './pages/dashboards/ProviderDashboard'
import ManagerDashboard from './pages/dashboards/ManagerDashboard'
import WorkerDashboard from './pages/dashboards/WorkerDashboard'
import ParticipantDashboard from './pages/dashboards/ParticipantDashboard'
import HRDashboard from './pages/dashboards/HRDashboard'
import FinanceDashboard from './pages/dashboards/FinanceDashboard'
import ITDashboard from './pages/dashboards/ITDashboard'
import DataEntryDashboard from './pages/dashboards/DataEntryDashboard'
import { auth } from './services/auth'
import { routeForRole } from './utils/roleRoutes'

// SIL Management components
import SILDashboard from './pages/sil-management/SILDashboard'
import HomesList from './pages/sil-management/HomesList'
import HomeProfile from './pages/sil-management/HomeProfile'
import HomeNew from './pages/sil-management/HomeNew'
import HomeEdit from './pages/sil-management/HomeEdit'
import HomeDocuments from './pages/sil-management/HomeDocuments'
import MaintenanceHistory from './pages/sil-management/MaintenanceHistory'
import RoomManagement from './pages/sil-management/RoomManagement'

// Admin Components - COMPLETE ADMIN SYSTEM
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import DynamicDataManager from './components/admin/DynamicDataManager'
import UserManagement from './components/admin/UserManagement'
import SystemSettings from './components/admin/SystemSettings'

// NEW: User Management Components
import UsersList from './pages/admin/users/UsersList'
import AddSupportWorker from './pages/admin/users/AddSupportWorker'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Placeholder component for coming soon features
const PlaceholderPage: React.FC<{ title: string; description?: string }> = ({ 
  title, 
  description = "This feature is coming soon!" 
}) => (
  <div className="p-6">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <button 
        onClick={() => window.history.back()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Go Back
      </button>
    </div>
  </div>
)

// 404 Not Found Page
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
      <div className="space-y-3">
        <a 
          href="/" 
          className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Home
        </a>
        <a 
          href="/dashboard" 
          className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Go to Dashboard
        </a>
        <a 
          href="/admin" 
          className="block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Admin Panel
        </a>
      </div>
    </div>
  </div>
)

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public routes (without layout) */}
            <Route
              path="/"
              element={
                auth.token()
                  ? <Navigate to={routeForRole(auth.role())} replace />
                  : <Navigate to="/login" replace />
              }
            />
            <Route path="/welcome" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/referral" element={<NDISReferralForm />} />
            
            {/* ADMIN ROUTES - Separate admin system with user management */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dynamic-data" element={<DynamicDataManager />} />
              <Route path="users" element={<UserManagement />} />
              
              {/* NEW: Detailed User Management Routes */}
              <Route path="users/list" element={<UsersList />} />
              <Route path="users/new-support-worker" element={<AddSupportWorker />} />
              
              <Route path="settings" element={<SystemSettings />} />
            </Route>
            
            {/* Protected routes (with main layout) */}
            <Route path="/*" element={<Layout />}>
              {/* Role-driven dashboard routes */}
              <Route
                path="dashboard"
                element={<Navigate to={routeForRole(auth.role())} replace />}
              />
              <Route
                path="dashboard/provider"
                element={
                  <RoleRoute allow={['PROVIDER_ADMIN']}>
                    <ProviderDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/manager"
                element={
                  <RoleRoute allow={['SERVICE_MANAGER']}>
                    <ManagerDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/worker"
                element={
                  <RoleRoute allow={['SUPPORT_WORKER']}>
                    <WorkerDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/participant"
                element={
                  <RoleRoute allow={['PARTICIPANT']}>
                    <ParticipantDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/hr"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER']}>
                    <HRDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/finance"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <FinanceDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/it"
                element={
                  <RoleRoute allow={['IT']}>
                    <ITDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="dashboard/data"
                element={
                  <RoleRoute allow={['DATA_ENTRY']}>
                    <DataEntryDashboard />
                  </RoleRoute>
                }
              />
              
              {/* Referral Management Routes */}
              <Route path="referrals" element={<ReferralManagement />} />
              <Route path="referrals/:id" element={<ReferralValidate />} />
              
              {/* Participant Management Routes */}
              <Route path="participants" element={<Participants />} />
              <Route path="participants/new" element={<ParticipantNew />} />
              <Route path="participants/:id" element={<ParticipantProfile />} />
              <Route path="participants/:id/edit" element={<ParticipantEdit />} />
              
              {/* ENHANCED DOCUMENT MANAGEMENT ROUTES */}
              <Route path="documents" element={<Documents />} />
              <Route path="participants/:id/documents" element={<ParticipantDocuments />} />
              <Route path="participants/:id/generate-documents" element={<DocumentGenerationPage />} />
              <Route path="participants/:participantId/documents/:documentId" element={<DocumentViewer />} />
              <Route path="participants/:id/generate-document" element={<DocumentGenerationPage />} />
              <Route path="documents/participant/:participantId" element={<ParticipantDocuments />} />
              <Route path="documents/generate/:participantId" element={<DocumentGenerationPage />} />
              <Route path="documents/view/:participantId/:documentId" element={<DocumentViewer />} />
              
              {/* CRITICAL: CARE WORKFLOW ROUTES FOR ONBOARDING CONVERSION */}
              <Route path="prospective" element={<ProspectiveDashboard />} />
              <Route path="care/setup/:participantId" element={<CareSetup />} />
              <Route path="care/plan/:participantId/edit" element={<CarePlanEditor />} />
              <Route path="care/plan/:participantId" element={<CarePlanEditor />} />
              <Route path="care/risk-assessment/:participantId/edit" element={<RiskAssessmentEditor />} />
              <Route path="care/risk-assessment/:participantId" element={<RiskAssessmentEditor />} />
              
              {/* NEW: AI Care Assistant Route */}
              <Route path="care/ai/:participantId" element={<AICarePage />} />
              
              {/* 🎯 KEY ROUTE: Onboarding Sign-off Page */}
              <Route path="care/signoff/:participantId" element={<CareSignoff />} />
              <Route
                path="manager/reviews"
                element={
                  <RoleRoute allow={['SERVICE_MANAGER']}>
                    <ManagerReviewQueue />
                  </RoleRoute>
                }
              />
              
              {/* QUOTATION MANAGEMENT ROUTES - NEW */}
              <Route path="quotations" element={<QuotationsList />} />
              <Route path="quotations/:quotationId" element={<QuotationDetail />} />
              <Route path="quotations/participants/:participantId" element={<QuotationManagement />} />
              
              {/* Participant to Scheduling Workflow Route */}
              <Route path="participants/:id/scheduling-setup" element={<ParticipantToSchedulingWorkflow />} />
              
              {/* Scheduling Routes */}
              <Route
                path="scheduling"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <SchedulingDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="scheduling/calendar"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <CalendarView />
                  </RoleRoute>
                }
              />
              <Route
                path="scheduling/roster"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <RosterManagement />
                  </RoleRoute>
                }
              />
              <Route
                path="scheduling/appointment/new"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <NewAppointment />
                  </RoleRoute>
                }
              />
              <Route
                path="scheduling/appointment/:id/edit"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <EditAppointment />
                  </RoleRoute>
                }
              />
              <Route
                path="scheduling/appointment/:id"
                element={
                  <RoleRoute allow={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER']}>
                    <AppointmentDetail />
                  </RoleRoute>
                }
              />
              
              {/* Scheduling Placeholder Routes */}
              <Route path="scheduling/requests" element={
                <PlaceholderPage title="Schedule Requests" />
              } />
              
              <Route path="scheduling/settings" element={
                <PlaceholderPage 
                  title="Scheduling Settings" 
                  description="Configure scheduling preferences and rules." 
                />
              } />

              {/* INVOICING ROUTES */}
              <Route
                path="invoicing"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <InvoicingDashboard />
                  </RoleRoute>
                }
              />
              <Route
                path="invoicing/generate"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <InvoiceGeneration />
                  </RoleRoute>
                }
              />
              <Route
                path="invoicing/payments"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <PaymentTracking />
                  </RoleRoute>
                }
              />
              <Route
                path="invoicing/xero-sync"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <XeroSync />
                  </RoleRoute>
                }
              />
              <Route
                path="invoicing/invoice/:id"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <InvoiceDetail />
                  </RoleRoute>
                }
              />
              <Route
                path="invoicing/invoice/:id/edit"
                element={
                  <RoleRoute allow={['FINANCE', 'SERVICE_MANAGER']}>
                    <InvoiceEdit />
                  </RoleRoute>
                }
              />

              {/* Invoicing Placeholder Routes */}
              
              <Route path="invoicing/invoice/:id/payment" element={
                <PlaceholderPage title="Record Payment" description="Payment recording feature coming soon!" />
              } />

              <Route path="invoicing/invoices" element={
                <PlaceholderPage title="All Invoices" description="Comprehensive invoice list coming soon!" />
              } />

              <Route path="invoicing/reports" element={
                <PlaceholderPage title="Financial Reports" description="Advanced reporting features coming soon!" />
              } />

              <Route path="invoicing/settings" element={
                <PlaceholderPage 
                  title="Invoicing Settings" 
                  description="Configure invoicing preferences and automation." 
                />
              } />

              {/* SIL MANAGEMENT ROUTES */}
              <Route path="sil" element={<SILDashboard />} />
              <Route path="sil/homes" element={<HomesList />} />
              <Route path="sil/homes/new" element={<HomeNew />} />
              <Route path="sil/homes/:id" element={<HomeProfile />} />
              <Route path="sil/homes/:id/edit" element={<HomeEdit />} />
              <Route path="sil/homes/:id/documents" element={<HomeDocuments />} />
              <Route path="sil/homes/:id/maintenance" element={<MaintenanceHistory />} />
              <Route path="sil/homes/:id/rooms" element={<RoomManagement />} />

              {/* SIL Placeholder Routes */}
              <Route path="sil/maintenance" element={
                <PlaceholderPage 
                  title="Maintenance Overview" 
                  description="System-wide maintenance tracking coming soon!" 
                />
              } />

              <Route path="sil/reports" element={
                <PlaceholderPage 
                  title="SIL Reports" 
                  description="Property and occupancy reports coming soon!" 
                />
              } />

              <Route path="sil/settings" element={
                <PlaceholderPage 
                  title="SIL Settings" 
                  description="Configure SIL management preferences." 
                />
              } />

              {/* HR Management Placeholder Routes */}
              <Route path="hr/*" element={
                <PlaceholderPage 
                  title="HR Management" 
                  description="Human Resource Management features coming soon!" 
                />
              } />

              {/* Reports Placeholder Routes */}
              <Route path="reports/*" element={
                <PlaceholderPage 
                  title="Reports & Analytics" 
                  description="Advanced reporting features coming soon!" 
                />
              } />

              {/* Settings Placeholder Routes */}
              <Route path="settings/*" element={
                <PlaceholderPage 
                  title="System Settings" 
                  description="System configuration features coming soon!" 
                />
              } />
            </Route>
            
            {/* 404 Catch-all route - MUST BE LAST */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          
          {/* Global toast notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#FFFFFF',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#FFFFFF',
                },
              },
            }}
          />
        </div>
      </Router>
      
      {/* React Query Devtools - only in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
