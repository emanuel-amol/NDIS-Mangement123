// frontend/src/App.tsx - COMPLETE FILE WITH SCHEDULING WORKFLOW ROUTES
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Application Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Referral Routes */}
        <Route path="/referral" element={<NDISReferralForm />} />
        <Route path="/referrals" element={<ReferralManagement />} />
        
        {/* Participant Management Routes */}
        <Route path="/participants" element={<Participants />} />
        <Route path="/participants/new" element={<ParticipantNew />} />
        <Route path="/participants/:id" element={<ParticipantProfile />} />
        <Route path="/participants/:id/edit" element={<ParticipantEdit />} />
        
        {/* Document Management Routes - ORDER MATTERS! */}
        <Route path="/documents" element={<Documents />} />
        
        {/* IMPORTANT: Specific routes must come before generic parameter routes */}
        <Route path="/participants/:id/generate-documents" element={<DocumentGenerationPage />} />
        <Route path="/participants/:id/documents" element={<ParticipantDocuments />} />
        <Route path="/participants/:participantId/documents/:documentId" element={<DocumentViewer />} />
        
        {/* NEW: Participant to Scheduling Workflow Route */}
        <Route path="/participants/:id/scheduling-setup" element={<ParticipantToSchedulingWorkflow />} />
        
        {/* Scheduling Routes - Main scheduling system */}
        <Route path="/scheduling" element={<SchedulingDashboard />} />
        <Route path="/scheduling/calendar" element={<CalendarView />} />
        <Route path="/scheduling/roster" element={<RosterManagement />} />
        
        {/* Appointment Management Routes - Specific routes first */}
        <Route path="/scheduling/appointment/new" element={<NewAppointment />} />
        <Route path="/scheduling/appointment/:id/edit" element={<EditAppointment />} />
        <Route path="/scheduling/appointment/:id" element={<AppointmentDetail />} />
        
        {/* Additional Scheduling Routes (to be implemented) */}
        <Route path="/scheduling/requests" element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
        
        <Route path="/scheduling/settings" element={
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
        
        {/* Prospective Participant Workflow Routes */}
        <Route path="/prospective" element={<ProspectiveDashboard />} />
        
        {/* Care Workflow Routes */}
        <Route path="/care/setup/:participantId" element={<CareSetup />} />
        <Route path="/care/plan/:participantId/edit" element={<CarePlanEditor />} />
        <Route path="/care/risk-assessment/:participantId/edit" element={<RiskAssessmentEditor />} />
        <Route path="/care/signoff/:participantId" element={<CareSignoff />} />
        
        {/* Care Plan View Routes */}
        <Route path="/care/plan/:participantId" element={<CarePlanEditor />} />
        <Route path="/care/risk-assessment/:participantId" element={<RiskAssessmentEditor />} />
        
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
                  href="/participants" 
                  className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View Participants
                </a>
                <a 
                  href="/documents" 
                  className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Document Management
                </a>
                <a 
                  href="/scheduling" 
                  className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Scheduling Dashboard
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