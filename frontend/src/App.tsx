import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

// Layout and shared wrappers
import Layout from './components/Layout';
import PermissionRoute from './components/PermissionRoute';
import { PERMISSIONS } from './config/permissions';

// Auth pages
import Home from './pages/main-application/Home';
import Login from './pages/main-application/Login';
import Register from './pages/main-application/Register';
import UnauthorizedPage from './pages/main-application/Unauthorized';

// Public pages
import Sign from './pages/public/Sign';

// Admin system
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import DynamicDataManager from './components/admin/DynamicDataManager';
import UserManagement from './components/admin/UserManagement';
import SystemSettings from './components/admin/SystemSettings';
import UsersList from './pages/admin/users/UsersList';
import AddSupportWorker from './pages/admin/users/AddSupportWorker';

// Dashboards (role specific) - PARTICIPANTS
import ProviderDashboard from './pages/dashboards/ProviderDashboard';
import ManagerDashboard from './pages/dashboards/ManagerDashboard';
import WorkerDashboard from './pages/dashboards/WorkerDashboard';
import ParticipantDashboard from './pages/dashboards/ParticipantDashboard';
import FinanceDashboard from './pages/dashboards/FinanceDashboard';
import ITDashboard from './pages/dashboards/ITDashboard';
import DataEntryDashboard from './pages/dashboards/DataEntryDashboard';

// HR System Components (Port 8001)
import DashboardHRM from './pages/hr/DashboardHRM';
import IntakeForm from './components/applicant/Can-intake-form';
import EvaluationForm from './components/applicant/EvaluationForm';
import ApplicantProfile from './components/applicant/Applicant_profile';
import ApplicantsPage from './pages/hr//ApplicantsPage';
import WorkersPage from './pages/hr/WorkersPage';
import ApplicantProfileDocument from './components/applicant/Applicant_profile_document';
import ApplicantProfileForm from './components/applicant/Applicant_profile_form';
import ApplicantProfileSetting from './components/applicant/Applicant_profile_setting';
import AddEmployee from './components/employee/Add_employee';
import DashboardPage from './pages/hr/DashboardPage';
import MyProfilePage from './pages/hr//MyProfilePage';
import ReferenceForm from './pages/hr/ReferenceForm';

// Referral management - PARTICIPANTS
import NDISReferralForm from './pages/referral/ReferralForm';
import ReferralManagement from './pages/referral/ReferralManagement';
import ReferralValidate from './pages/referral/ReferralValidate';

// Participant management
import Participants from './pages/participant-management/participants';
import ParticipantProfile from './pages/participant-management/ParticipantProfile';
import ParticipantEdit from './pages/participant-management/ParticipantEdit';
import ParticipantNew from './pages/participant-management/ParticipantNew';

// Prospective participant workflow
import ProspectiveDashboard from './pages/prospective-participant/ProspectiveDashboard';
import InProgress from './pages/workflow/InProgress';
import PendingApproval from './pages/workflow/PendingApproval';

// Care workflow
import CareSetup from './pages/care-workflow/CareSetup';
import CarePlanEditor from './pages/care-workflow/CarePlanEditor';
import CarePlanViewer from './pages/care-workflow/CarePlanViewer';
import RiskAssessmentEditor from './pages/care-workflow/RiskAssessmentEditor';
import RiskAssessmentViewer from './pages/care-workflow/RiskAssessmentViewer';
import CareSignoff from './pages/care-workflow/CareSignOff';
import AICarePage from './pages/care-workflow/AICarePage';
import ManagerReviewQueue from './pages/care-workflow/ManagerReviewQueue';

// Document management
import Documents from './pages/documents/Documents';
import ParticipantDocuments from './pages/documents/ParticipantDocuments';
import DocumentViewer from './pages/documents/DocumentViewer';
import { DocumentGenerationPage } from './components/documents/DocumentGeneration';

// Quotation management
import QuotationsList from './pages/quotations/QuotationsList';
import QuotationManagement from './pages/quotations/QuotationManagement';
import QuotationDetail from './pages/quotations/QuotationDetail';

// Scheduling
import SchedulingDashboard from './pages/scheduling/SchedulingDashboard';
import CalendarView from './pages/scheduling/CalendarView';
import NewAppointment from './pages/scheduling/NewAppointment';
import EditAppointment from './pages/scheduling/EditAppointment';
import AppointmentDetail from './pages/scheduling/AppointmentDetail';
import RosterManagement from './pages/scheduling/RosterManagement';
import ParticipantToSchedulingWorkflow from './pages/scheduling/ParticipantToSchedulingWorkflow';

// Invoicing
import InvoicingDashboard from './pages/invoicing/InvoicingDashboard';
import InvoiceDetail from './pages/invoicing/InvoiceDetail';
import InvoiceEdit from './pages/invoicing/InvoiceEdit';
import InvoiceGeneration from './pages/invoicing/InvoiceGeneration';
import PaymentTracking from './pages/invoicing/PaymentTracking';
import XeroSync from './pages/invoicing/XeroSync';

// SIL management
import SILDashboard from './pages/sil-management/SILDashboard';
import HomesList from './pages/sil-management/HomesList';
import HomeProfile from './pages/sil-management/HomeProfile';
import HomeNew from './pages/sil-management/HomeNew';
import HomeEdit from './pages/sil-management/HomeEdit';
import HomeDocuments from './pages/sil-management/HomeDocuments';
import MaintenanceHistory from './pages/sil-management/MaintenanceHistory';
import RoomManagement from './pages/sil-management/RoomManagement';

// Utilities
import { useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PlaceholderPage: React.FC<{ title: string; description?: string }> = ({
  title,
  description = 'This feature is coming soon!',
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
);

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-8">The page you are looking for does not exist.</p>
        <div className="space-y-3">
          <a href="/" className="block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Return to Home
          </a>
          <a href="/dashboard" className="block px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
            Go to Dashboard
          </a>
          <a href="/admin" className="block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Admin Panel
          </a>
        </div>
      </div>
    </div>
  );
};

// Dashboard redirect component
const DashboardRedirect: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.toUpperCase();
  
  console.log('DashboardRedirect - User role:', role);
  
  switch (role) {
    case 'HR':
      return <Navigate to="/dashboard/hr" replace />;
    case 'PROVIDER_ADMIN':
      return <Navigate to="/dashboard/provider" replace />;
    case 'SERVICE_MANAGER':
      return <Navigate to="/dashboard/manager" replace />;
    case 'SUPPORT_WORKER':
      return <Navigate to="/dashboard/worker" replace />;
    case 'PARTICIPANT':
      return <Navigate to="/dashboard/participant" replace />;
    case 'FINANCE':
      return <Navigate to="/dashboard/finance" replace />;
    case 'IT':
      return <Navigate to="/dashboard/it" replace />;
    case 'DATA_ENTRY':
      return <Navigate to="/dashboard/data" replace />;
    default:
      return <Navigate to="/dashboard/provider" replace />;
  }
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* ============================================= */}
            {/* PUBLIC ROUTES */}
            {/* ============================================= */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/referral" element={<NDISReferralForm />} />
            <Route path="/sign/:token" element={<Sign />} />
            <Route path="/reference/:token" element={<ReferenceForm />} />

            {/* ============================================= */}
            {/* ADMIN SYSTEM */}
            {/* ============================================= */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dynamic-data" element={<DynamicDataManager />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/list" element={<UsersList />} />
              <Route path="users/new-support-worker" element={<AddSupportWorker />} />
              <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* ============================================= */}
            {/* HR SYSTEM (Port 8001) - OUTSIDE Layout */}
            {/* COMPLETELY SEPARATE FROM PARTICIPANTS */}
            {/* ============================================= */}
            <Route
              path="/dashboard/hr"
              element={
                <PermissionRoute roles={['HR', 'SERVICE_MANAGER']}>
                  <DashboardHRM />
                </PermissionRoute>
              }
            />
            
            {/* HR System Routes - All OUTSIDE Layout */}
            <Route path="/profile" element={<MyProfilePage />} />
            <Route path="/candidate-form" element={<IntakeForm />} />
            <Route path="/evaluation" element={<EvaluationForm />} />
            <Route path="/admin/hrm" element={<DashboardHRM />} />
            <Route path="/admin/users" element={<WorkersPage />} />
            <Route path="/admin/applicants" element={<ApplicantsPage />} />
            <Route path="/applicants" element={<ApplicantsPage />} />
            
            {/* HR Applicant Profile Routes */}
            <Route path="/portal/profile/admin/:userId" element={<ApplicantProfile />} />
            <Route path="/portal/profile/admin/:userId/documents" element={<ApplicantProfileDocument />} />
            <Route path="/portal/profile/admin/:userId/forms" element={<ApplicantProfileForm />} />
            <Route path="/portal/profile/admin/:userId/settings" element={<ApplicantProfileSetting />} />
            
            {/* HR Self Profile Routes */}
            <Route path="/portal/profile" element={<ApplicantProfile />} />
            <Route path="/portal/profile/documents" element={<ApplicantProfileDocument />} />
            <Route path="/portal/profile/forms" element={<ApplicantProfileForm />} />
            <Route path="/portal/profile/settings" element={<ApplicantProfileSetting />} />
            
            {/* HR Applicant Alternative Routes */}
            <Route path="/applicant/:id" element={<ApplicantProfile />} />
            <Route path="/applicant/:id/documents" element={<ApplicantProfileDocument />} />
            <Route path="/applicant/:id/forms" element={<ApplicantProfileForm />} />
            <Route path="/applicant/:id/settings" element={<ApplicantProfileSetting />} />
            
            {/* HR Employee Management */}
            <Route path="/portal/employees/new" element={<AddEmployee />} />
            <Route path="/admin/users/new" element={<AddEmployee />} />
            
            {/* HR Legacy Routes */}
            <Route path="/components/applicant/Applicant_List" element={<ApplicantsPage />} />
            <Route path="/components/employee/Employee_List" element={<WorkersPage />} />
            <Route path="/components/applicant/Can-intake-form" element={<IntakeForm />} />
            <Route path="/components/applicant/Applicant_profile" element={<ApplicantProfile />} />
            <Route path="/components/applicant/Applicant_profile_document" element={<ApplicantProfileDocument />} />
            <Route path="/components/applicant/Applicant_profile_form" element={<ApplicantProfileForm />} />
            <Route path="/components/applicant/Applicant_profile_setting" element={<ApplicantProfileSetting />} />

            {/* ============================================= */}
            {/* PARTICIPANTS SYSTEM (Port 8000) - INSIDE Layout */}
            {/* ============================================= */}
            <Route element={<Layout />}>
              {/* Generic dashboard redirect */}
              <Route path="/dashboard" element={<DashboardRedirect />} />

              {/* Role-specific Dashboards - PARTICIPANTS ONLY */}
              <Route
                path="/dashboard/provider"
                element={
                  <PermissionRoute roles={['PROVIDER_ADMIN', 'SERVICE_MANAGER']}>
                    <ProviderDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/manager"
                element={
                  <PermissionRoute roles={['SERVICE_MANAGER']}>
                    <ManagerDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/worker"
                element={
                  <PermissionRoute roles={['SUPPORT_WORKER']}>
                    <WorkerDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/participant"
                element={
                  <PermissionRoute roles={['PARTICIPANT']}>
                    <ParticipantDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/finance"
                element={
                  <PermissionRoute roles={['FINANCE', 'SERVICE_MANAGER']}>
                    <FinanceDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/it"
                element={
                  <PermissionRoute roles={['IT']}>
                    <ITDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/dashboard/data"
                element={
                  <PermissionRoute roles={['DATA_ENTRY']}>
                    <DataEntryDashboard />
                  </PermissionRoute>
                }
              />

              {/* Referral management */}
              <Route path="/referrals" element={<ReferralManagement />} />
              <Route path="/referrals/:id" element={<ReferralValidate />} />

              {/* Participant management */}
              <Route path="/participants" element={<Participants />} />
              <Route path="/participants/new" element={<ParticipantNew />} />
              <Route path="/participants/:id" element={<ParticipantProfile />} />
              <Route path="/participants/:id/edit" element={<ParticipantEdit />} />
              <Route path="/participants/:id/scheduling-setup" element={<ParticipantToSchedulingWorkflow />} />

              <Route path="/in-progress" element={<InProgress />} />
              <Route 
                path="/pending-approval" 
                element={
                  <PermissionRoute roles={['PROVIDER_ADMIN', 'SERVICE_MANAGER']}>
                    <PendingApproval />
                  </PermissionRoute>
                } 
              />

              {/* Document management */}
              <Route path="/documents" element={<Documents />} />
              <Route path="/participants/:id/documents" element={<ParticipantDocuments />} />
              <Route path="/participants/:id/generate-documents" element={<DocumentGenerationPage />} />
              <Route path="/participants/:participantId/documents/:documentId" element={<DocumentViewer />} />
              <Route path="/participants/:id/generate-document" element={<DocumentGenerationPage />} />
              <Route path="/documents/participant/:participantId" element={<ParticipantDocuments />} />
              <Route path="/documents/generate/:participantId" element={<DocumentGenerationPage />} />
              <Route path="/documents/view/:participantId/:documentId" element={<DocumentViewer />} />

              {/* Care workflow */}
              <Route path="/prospective" element={<ProspectiveDashboard />} />
              <Route path="/care/setup/:participantId" element={<CareSetup />} />
              
              {/* View-only routes */}
              <Route path="/care/plan/:participantId" element={<CarePlanViewer />} />
              <Route path="/care/plan/:participantId/versions/:versionId" element={<CarePlanViewer />} />
              <Route path="/care/risk-assessment/:participantId" element={<RiskAssessmentViewer />} />
              <Route path="/care/risk-assessment/:participantId/versions/:versionId" element={<RiskAssessmentViewer />} />

              {/* Edit routes */}
              <Route path="/care/plan/:participantId/edit" element={<CarePlanEditor />} />
              <Route path="/care/plan/:participantId/versions/:versionId/edit" element={<CarePlanEditor />} />
              <Route path="/care/risk-assessment/:participantId/edit" element={<RiskAssessmentEditor />} />
              <Route path="/care/risk-assessment/:participantId/versions/:versionId/edit" element={<RiskAssessmentEditor />} />
              
              <Route path="/care/ai/:participantId" element={<AICarePage />} />
              <Route path="/care/signoff/:participantId" element={<CareSignoff />} />
              <Route
                path="/manager/reviews"
                element={
                  <PermissionRoute roles={['SERVICE_MANAGER']}>
                    <ManagerReviewQueue />
                  </PermissionRoute>
                }
              />

              {/* Quotation management */}
              <Route path="/quotations" element={<QuotationsList />} />
              <Route path="/quotations/:quotationId" element={<QuotationDetail />} />
              <Route path="/quotations/participants/:participantId" element={<QuotationManagement />} />

              {/* Scheduling */}
              <Route
                path="/scheduling"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <SchedulingDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/scheduling/calendar"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <CalendarView />
                  </PermissionRoute>
                }
              />
              <Route
                path="/scheduling/roster"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <RosterManagement />
                  </PermissionRoute>
                }
              />
              <Route
                path="/scheduling/appointment/new"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <NewAppointment />
                  </PermissionRoute>
                }
              />
              <Route
                path="/scheduling/appointment/:id"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <AppointmentDetail />
                  </PermissionRoute>
                }
              />
              <Route
                path="/scheduling/appointment/:id/edit"
                element={
                  <PermissionRoute roles={['HR', 'SERVICE_MANAGER', 'SUPPORT_WORKER', 'SERVICE_ADMIN', 'PROVIDER_ADMIN']}>
                    <EditAppointment />
                  </PermissionRoute>
                }
              />

              {/* Invoicing */}
              <Route
                path="/invoicing"
                element={
                  <PermissionRoute permission={PERMISSIONS.INVOICING_VIEW}>
                    <InvoicingDashboard />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/generate"
                element={
                  <PermissionRoute permission={PERMISSIONS.INVOICING_GENERATE}>
                    <InvoiceGeneration />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/payments"
                element={
                  <PermissionRoute permission={PERMISSIONS.PAYMENT_VIEW}>
                    <PaymentTracking />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/xero-sync"
                element={
                  <PermissionRoute permission={PERMISSIONS.INVOICING_XERO_SYNC}>
                    <XeroSync />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/invoice/:id"
                element={
                  <PermissionRoute permission={PERMISSIONS.INVOICING_VIEW}>
                    <InvoiceDetail />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/invoice/:id/edit"
                element={
                  <PermissionRoute permission={PERMISSIONS.INVOICING_EDIT}>
                    <InvoiceEdit />
                  </PermissionRoute>
                }
              />
              <Route
                path="/invoicing/invoice/:id/payment"
                element={
                  <PlaceholderPage title="Record Payment" description="Payment recording feature coming soon!" />
                }
              />
              <Route
                path="/invoicing/invoices"
                element={
                  <PlaceholderPage title="All Invoices" description="Comprehensive invoice list coming soon!" />
                }
              />
              <Route
                path="/invoicing/reports"
                element={
                  <PlaceholderPage title="Financial Reports" description="Advanced reporting features coming soon!" />
                }
              />
              <Route
                path="/invoicing/settings"
                element={
                  <PlaceholderPage
                    title="Invoicing Settings"
                    description="Configure invoicing preferences and automation."
                  />
                }
              />

              {/* SIL management */}
              <Route path="/sil" element={<SILDashboard />} />
              <Route path="/sil/homes" element={<HomesList />} />
              <Route path="/sil/homes/new" element={<HomeNew />} />
              <Route path="/sil/homes/:id" element={<HomeProfile />} />
              <Route path="/sil/homes/:id/edit" element={<HomeEdit />} />
              <Route path="/sil/homes/:id/documents" element={<HomeDocuments />} />
              <Route path="/sil/homes/:id/maintenance" element={<MaintenanceHistory />} />
              <Route path="/sil/homes/:id/rooms" element={<RoomManagement />} />
              <Route
                path="/sil/maintenance"
                element={
                  <PlaceholderPage
                    title="Maintenance Overview"
                    description="System-wide maintenance tracking coming soon!"
                  />
                }
              />
              <Route
                path="/sil/reports"
                element={
                  <PlaceholderPage
                    title="SIL Reports"
                    description="Property and occupancy reports coming soon!"
                  />
                }
              />
              <Route
                path="/sil/settings"
                element={
                  <PlaceholderPage
                    title="SIL Settings"
                    description="Configure SIL management preferences."
                  />
                }
              />

              {/* Placeholders */}
              <Route
                path="/hr/*"
                element={
                  <PlaceholderPage
                    title="HR Management"
                    description="Human Resource Management features coming soon!"
                  />
                }
              />
              <Route
                path="/reports/*"
                element={
                  <PlaceholderPage
                    title="Reports & Analytics"
                    description="Advanced reporting features coming soon!"
                  />
                }
              />
              <Route
                path="/settings/*"
                element={
                  <PlaceholderPage
                    title="System Settings"
                    description="System configuration features coming soon!"
                  />
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>

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
      </BrowserRouter>

      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}