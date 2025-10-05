// frontend/src/App.tsx - COMPLETE FILE WITH FIXED ROUTES
import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

// Main Application Components
import Layout from './components/layouts/Layout'
import Home from './pages/main-application/Home'
import Login from './pages/main-application/Login'
import Register from './pages/main-application/Register'
import Dashboard from './pages/main-application/Dashboard'

// Role-Based Layouts
import ManagerLayout from './components/layouts/ManagerLayout'
import WorkerLayout from './components/layouts/WorkerLayout'
import ParticipantLayout from './components/layouts/ParticipantLayout'

// Role-Based Dashboard Components
import AdminDashboardRole from './pages/dashboards/AdminDashboard'
import ProviderDashboard from './pages/dashboards/ProviderDashboard'
import ManagerDashboard from './pages/dashboards/ManagerDashboard'
import WorkerDashboard from './pages/dashboards/WorkerDashboard'
import ParticipantDashboard from './pages/dashboards/ParticipantDashboard'
import HRDashboard from './pages/dashboards/HRDashboard'
import FinanceDashboard from './pages/dashboards/FinanceDashboard'
import RegionalDashboard from './pages/dashboards/RegionalDashboard'
import ITDashboard from './pages/dashboards/ITDashboard'
import DataEntryDashboard from './pages/dashboards/DataEntryDashboard'

// Referral Components
import NDISReferralForm from './pages/referral/ReferralForm'
import ReferralManagement from './pages/referral/ReferralManagement'

// Participant Management Components
import Participants from './pages/participant-management/participants'
import ParticipantProfile from './pages/participant-management/ParticipantProfile'
import ParticipantEdit from './pages/participant-management/ParticipantEdit'
import ParticipantNew from './pages/participant-management/ParticipantNew'
import ReferralValidate from './pages/participant-management/ReferralValidate'

// Prospective Participant Components
import ProspectiveDashboard from './pages/prospective-participant/ProspectiveDashboard'

// Care workflow components
import CareSetup from './pages/care-workflow/CareSetup'
import CarePlanEditor from './pages/care-workflow/CarePlanEditor'
import RiskAssessmentEditor from './pages/care-workflow/RiskAssessmentEditor'
import CareSignoff from './pages/care-workflow/CareSignOff'
import AICarePage from './pages/care-workflow/AICarePage'

// Enhanced Document management components
import Documents from './pages/documents/Documents'
import ParticipantDocuments from './pages/documents/ParticipantDocuments'
import DocumentViewer from './pages/documents/DocumentViewer'
import DocumentGenerationPage from './pages/documents/DocumentGenerationPage'

// Quotation Management Components
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
import InvoiceGeneration from './pages/invoicing/InvoiceGeneration'
import PaymentTracking from './pages/invoicing/PaymentTracking'
import XeroSync from './pages/invoicing/XeroSync'

// SIL Management components
import SILDashboard from './pages/sil-management/SILDashboard'
import HomesList from './pages/sil-management/HomesList'
import HomeProfile from './pages/sil-management/HomeProfile'
import HomeNew from './pages/sil-management/HomeNew'
import HomeEdit from './pages/sil-management/HomeEdit'
import HomeDocuments from './pages/sil-management/HomeDocuments'
import MaintenanceHistory from './pages/sil-management/MaintenanceHistory'
import RoomManagement from './pages/sil-management/RoomManagement'

// Admin Components
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import DynamicDataManager from './components/admin/DynamicDataManager'
import UserManagement from './components/admin/UserManagement'
import SystemSettings from './components/admin/SystemSettings'

// User Management Components
import UsersList from './pages/admin/users/UsersList'
import AddSupportWorker from './pages/admin/users/AddSupportWorker'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

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

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
      <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
      <div className="space-y-3">
        <a href="/" className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Return to Home
        </a>
        <a href="/dashboard" className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
          Go to Dashboard
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
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/referral" element={<NDISReferralForm />} />
            
            {/* ADMIN ROUTES */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dynamic-data" element={<DynamicDataManager />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/list" element={<UsersList />} />
              <Route path="users/new-support-worker" element={<AddSupportWorker />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* MANAGER/PROVIDER ROUTES */}
            <Route path="/dashboard/manager" element={<ManagerLayout><ManagerDashboard /></ManagerLayout>} />
            <Route path="/dashboard/provider" element={<ManagerLayout><ProviderDashboard /></ManagerLayout>} />
            
            {/* Participant routes */}
            <Route path="/participants" element={<ManagerLayout><Participants /></ManagerLayout>} />
            <Route path="/participants/profile" element={<ManagerLayout><ParticipantProfile /></ManagerLayout>} />
            <Route path="/participants/new" element={<ManagerLayout><ParticipantNew /></ManagerLayout>} />
            <Route path="/participants/:id" element={<ManagerLayout><ParticipantProfile /></ManagerLayout>} />
            <Route path="/participants/:id/edit" element={<ManagerLayout><ParticipantEdit /></ManagerLayout>} />
            
            {/* Referral routes */}
            <Route path="/referrals" element={<ManagerLayout><ReferralManagement /></ManagerLayout>} />
            <Route path="/referrals/:id" element={<ManagerLayout><ReferralValidate /></ManagerLayout>} />
            <Route path="/referrals/review" element={<ManagerLayout><ReferralManagement /></ManagerLayout>} />
            <Route path="/prospective" element={<ManagerLayout><ProspectiveDashboard /></ManagerLayout>} />
            
            {/* Care routes - FIXED AND CONSOLIDATED */}
            <Route path="/care/setup/:participantId" element={<ManagerLayout><CareSetup /></ManagerLayout>} />
            
            {/* Care Plan Routes - All variations */}
            <Route path="/care/plan/:participantId" element={<ManagerLayout><CarePlanEditor /></ManagerLayout>} />
            <Route path="/care/plan/:participantId/edit" element={<ManagerLayout><CarePlanEditor /></ManagerLayout>} />
            <Route path="/care/plan/:participantId/versions/:versionId/edit" element={<ManagerLayout><CarePlanEditor /></ManagerLayout>} />
            
            {/* Risk Assessment Routes - All variations */}
            <Route path="/care/risk-assessment/:participantId" element={<ManagerLayout><RiskAssessmentEditor /></ManagerLayout>} />
            <Route path="/care/risk-assessment/:participantId/edit" element={<ManagerLayout><RiskAssessmentEditor /></ManagerLayout>} />
            <Route path="/care/risk-assessment/:participantId/versions/:versionId/edit" element={<ManagerLayout><RiskAssessmentEditor /></ManagerLayout>} />
            
            {/* AI and Sign-off Routes */}
            <Route path="/care/ai/:participantId" element={<ManagerLayout><AICarePage /></ManagerLayout>} />
            <Route path="/care/signoff/:participantId" element={<ManagerLayout><CareSignoff /></ManagerLayout>} />
            
            {/* Document routes */}
            <Route path="/documents/services" element={<ManagerLayout><PlaceholderPage title="Dynamic Service Documents" /></ManagerLayout>} />
            <Route path="/documents" element={<ManagerLayout><Documents /></ManagerLayout>} />
            <Route path="/participants/:id/documents" element={<ManagerLayout><ParticipantDocuments /></ManagerLayout>} />
            <Route path="/participants/:id/generate-documents" element={<ManagerLayout><DocumentGenerationPage /></ManagerLayout>} />
            <Route path="/participants/:participantId/documents/:documentId" element={<ManagerLayout><DocumentViewer /></ManagerLayout>} />
            <Route path="/participants/:id/generate-document" element={<ManagerLayout><DocumentGenerationPage /></ManagerLayout>} />
            <Route path="/documents/participant/:participantId" element={<ManagerLayout><ParticipantDocuments /></ManagerLayout>} />
            <Route path="/documents/generate/:participantId" element={<ManagerLayout><DocumentGenerationPage /></ManagerLayout>} />
            <Route path="/documents/view/:participantId/:documentId" element={<ManagerLayout><DocumentViewer /></ManagerLayout>} />
            
            {/* Other routes */}
            <Route path="/case-notes" element={<ManagerLayout><PlaceholderPage title="Case Notes" /></ManagerLayout>} />
            <Route path="/funding" element={<ManagerLayout><PlaceholderPage title="Funding" /></ManagerLayout>} />
            <Route path="/goals" element={<ManagerLayout><PlaceholderPage title="Goals" /></ManagerLayout>} />
            <Route path="/preferences" element={<ManagerLayout><PlaceholderPage title="Preferences" /></ManagerLayout>} />
            <Route path="/medications" element={<ManagerLayout><PlaceholderPage title="Medications" /></ManagerLayout>} />
            <Route path="/vaccinations" element={<ManagerLayout><PlaceholderPage title="Vaccinations" /></ManagerLayout>} />
            <Route path="/relationships" element={<ManagerLayout><PlaceholderPage title="Relationships" /></ManagerLayout>} />
            <Route path="/reports/participant-ops" element={<ManagerLayout><PlaceholderPage title="Participant Ops Reports" /></ManagerLayout>} />
            <Route path="/scheduling" element={<ManagerLayout><SchedulingDashboard /></ManagerLayout>} />
            
            {/* WORKER ROUTES */}
            <Route path="/dashboard/worker" element={<WorkerLayout><WorkerDashboard /></WorkerLayout>} />
            
            {/* PARTICIPANT ROUTES */}
            <Route path="/dashboard/participant" element={<ParticipantLayout><ParticipantDashboard /></ParticipantLayout>} />
            
            {/* Protected routes (with main layout) */}
            <Route path="/*" element={<Layout />}>
              <Route path="dashboard" element={<Dashboard />} />
              
              <Route path="dashboard/admin" element={<AdminDashboardRole />} />
              <Route path="dashboard/hr" element={<HRDashboard />} />
              <Route path="dashboard/finance" element={<FinanceDashboard />} />
              <Route path="dashboard/regional" element={<RegionalDashboard />} />
              <Route path="dashboard/it" element={<ITDashboard />} />
              <Route path="dashboard/data-entry" element={<DataEntryDashboard />} />
              
              <Route path="quotations" element={<QuotationsList />} />
              <Route path="quotations/:quotationId" element={<QuotationDetail />} />
              <Route path="quotations/participants/:participantId" element={<QuotationManagement />} />
              
              <Route path="participants/:id/scheduling-setup" element={<ParticipantToSchedulingWorkflow />} />
              
              <Route path="scheduling/calendar" element={<CalendarView />} />
              <Route path="scheduling/roster" element={<RosterManagement />} />
              <Route path="scheduling/appointment/new" element={<NewAppointment />} />
              <Route path="scheduling/appointment/:id/edit" element={<EditAppointment />} />
              <Route path="scheduling/appointment/:id" element={<AppointmentDetail />} />
              <Route path="scheduling/requests" element={<PlaceholderPage title="Schedule Requests" />} />
              <Route path="scheduling/settings" element={<PlaceholderPage title="Scheduling Settings" />} />

              <Route path="invoicing" element={<InvoicingDashboard />} />
              <Route path="invoicing/generate" element={<InvoiceGeneration />} />
              <Route path="invoicing/payments" element={<PaymentTracking />} />
              <Route path="invoicing/xero-sync" element={<XeroSync />} />
              <Route path="invoicing/invoice/:id" element={<InvoiceDetail />} />
              <Route path="invoicing/invoice/:id/edit" element={<PlaceholderPage title="Edit Invoice" />} />
              <Route path="invoicing/invoice/:id/payment" element={<PlaceholderPage title="Record Payment" />} />
              <Route path="invoicing/invoices" element={<PlaceholderPage title="All Invoices" />} />
              <Route path="invoicing/reports" element={<PlaceholderPage title="Financial Reports" />} />
              <Route path="invoicing/settings" element={<PlaceholderPage title="Invoicing Settings" />} />

              <Route path="sil" element={<SILDashboard />} />
              <Route path="sil/homes" element={<HomesList />} />
              <Route path="sil/homes/new" element={<HomeNew />} />
              <Route path="sil/homes/:id" element={<HomeProfile />} />
              <Route path="sil/homes/:id/edit" element={<HomeEdit />} />
              <Route path="sil/homes/:id/documents" element={<HomeDocuments />} />
              <Route path="sil/homes/:id/maintenance" element={<MaintenanceHistory />} />
              <Route path="sil/homes/:id/rooms" element={<RoomManagement />} />
              <Route path="sil/maintenance" element={<PlaceholderPage title="Maintenance Overview" />} />
              <Route path="sil/reports" element={<PlaceholderPage title="SIL Reports" />} />
              <Route path="sil/settings" element={<PlaceholderPage title="SIL Settings" />} />

              <Route path="hr/*" element={<PlaceholderPage title="HR Management" />} />
              <Route path="reports/*" element={<PlaceholderPage title="Reports & Analytics" />} />
              <Route path="settings/*" element={<PlaceholderPage title="System Settings" />} />
            </Route>
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: { background: '#363636', color: '#fff' },
              success: { duration: 3000, iconTheme: { primary: '#10B981', secondary: '#FFFFFF' } },
              error: { duration: 5000, iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' } },
            }}
          />
        </div>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App