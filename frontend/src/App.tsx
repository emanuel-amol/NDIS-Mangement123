// frontend/src/App.tsx - UPDATED WITH LAYOUT INTEGRATION
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/main-application/Home'
import Login from './pages/main-application/Login'
import Register from './pages/main-application/Register'
import NDISReferralForm from './pages/referral/ReferralForm'
import ReferralManagement from './pages/referral/ReferralManagement'
import ParticipantProfile from './pages/participant-management/ParticipantProfile'
import ParticipantEdit from './pages/participant-management/ParticipantEdit'
import ParticipantNew from './pages/participant-management/ParticipantNew'
import Dashboard from './pages/main-application/Dashboard'
import Participants from './pages/participant-management/participants'
import ProspectiveDashboard from './pages/prospective-participant/ProspectiveDashboard'

// Care workflow components
import CareSetup from './pages/care-workflow/CareSetup'
import CarePlanEditor from './pages/care-workflow/CarePlanEditor'
import RiskAssessmentEditor from './pages/care-workflow/RiskAssessmentEditor'
import CareSignoff from './pages/care-workflow/CareSignOff'

// Document management components
import Documents from './pages/documents/Documents'
import ParticipantDocuments from './pages/documents/ParticipantDocuments'
import DocumentViewer from './pages/documents/DocumentViewer'
import DocumentGenerationPage from './pages/documents/DocumentGenerationPage'

// Scheduling components
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes (without layout) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/referral" element={<NDISReferralForm />} />
        
        {/* Protected routes (with layout) */}
        <Route path="/*" element={<Layout />}>
          {/* Dashboard */}
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Referral Management Routes */}
          <Route path="referrals" element={<ReferralManagement />} />
          
          {/* Participant Management Routes */}
          <Route path="participants" element={<Participants />} />
          <Route path="participants/new" element={<ParticipantNew />} />
          <Route path="participants/:id" element={<ParticipantProfile />} />
          <Route path="participants/:id/edit" element={<ParticipantEdit />} />
          
          {/* Document Management Routes */}
          <Route path="documents" element={<Documents />} />
          <Route path="participants/:id/generate-documents" element={<DocumentGenerationPage />} />
          <Route path="participants/:id/documents" element={<ParticipantDocuments />} />
          <Route path="participants/:participantId/documents/:documentId" element={<DocumentViewer />} />
          
          {/* Participant to Scheduling Workflow Route */}
          <Route path="participants/:id/scheduling-setup" element={<ParticipantToSchedulingWorkflow />} />
          
          {/* Scheduling Routes */}
          <Route path="scheduling" element={<SchedulingDashboard />} />
          <Route path="scheduling/calendar" element={<CalendarView />} />
          <Route path="scheduling/roster" element={<RosterManagement />} />
          <Route path="scheduling/appointment/new" element={<NewAppointment />} />
          <Route path="scheduling/appointment/:id/edit" element={<EditAppointment />} />
          <Route path="scheduling/appointment/:id" element={<AppointmentDetail />} />
          
          {/* Scheduling Placeholder Routes */}
          <Route path="scheduling/requests" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Schedule Requests</h2>
                <p className="text-gray-600 mb-4">This feature is coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
          
          <Route path="scheduling/settings" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Scheduling Settings</h2>
                <p className="text-gray-600 mb-4">Configure scheduling preferences and rules.</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          {/* INVOICING ROUTES */}
          <Route path="invoicing" element={<InvoicingDashboard />} />
          <Route path="invoicing/generate" element={<InvoiceGeneration />} />
          <Route path="invoicing/payments" element={<PaymentTracking />} />
          <Route path="invoicing/xero-sync" element={<XeroSync />} />
          <Route path="invoicing/invoice/:id" element={<InvoiceDetail />} />
          
          {/* Invoicing Placeholder Routes */}
          <Route path="invoicing/invoice/:id/edit" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Edit Invoice</h2>
                <p className="text-gray-600 mb-4">Invoice editing feature coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
          
          <Route path="invoicing/invoice/:id/payment" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Record Payment</h2>
                <p className="text-gray-600 mb-4">Payment recording feature coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          <Route path="invoicing/invoices" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">All Invoices</h2>
                <p className="text-gray-600 mb-4">Comprehensive invoice list coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          <Route path="invoicing/reports" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Financial Reports</h2>
                <p className="text-gray-600 mb-4">Advanced reporting features coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          <Route path="invoicing/settings" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoicing Settings</h2>
                <p className="text-gray-600 mb-4">Configure invoicing preferences and automation.</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
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
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Maintenance Overview</h2>
                <p className="text-gray-600 mb-4">System-wide maintenance tracking coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          <Route path="sil/reports" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">SIL Reports</h2>
                <p className="text-gray-600 mb-4">Property and occupancy reports coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          <Route path="sil/settings" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">SIL Settings</h2>
                <p className="text-gray-600 mb-4">Configure SIL management preferences.</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
          
          {/* Prospective Participant Workflow Routes */}
          <Route path="prospective" element={<ProspectiveDashboard />} />
          
          {/* Care Workflow Routes */}
          <Route path="care/setup/:participantId" element={<CareSetup />} />
          <Route path="care/plan/:participantId/edit" element={<CarePlanEditor />} />
          <Route path="care/risk-assessment/:participantId/edit" element={<RiskAssessmentEditor />} />
          <Route path="care/signoff/:participantId" element={<CareSignoff />} />
          <Route path="care/plan/:participantId" element={<CarePlanEditor />} />
          <Route path="care/risk-assessment/:participantId" element={<RiskAssessmentEditor />} />

          {/* HR Management Placeholder Routes */}
          <Route path="hr/*" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">HR Management</h2>
                <p className="text-gray-600 mb-4">Human Resource Management features coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          {/* Reports Placeholder Routes */}
          <Route path="reports/*" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Reports & Analytics</h2>
                <p className="text-gray-600 mb-4">Advanced reporting features coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />

          {/* Settings Placeholder Routes */}
          <Route path="settings/*" element={
            <div className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">System Settings</h2>
                <p className="text-gray-600 mb-4">System configuration features coming soon!</p>
                <button 
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Go Back
                </button>
              </div>
            </div>
          } />
        </Route>
        
        {/* 404 Catch-all route - MUST BE LAST */}
        <Route path="*" element={
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
              </div>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  )
}

export default App