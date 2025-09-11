// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminLayout from './layouts/AdminLayout';
import PublicLayout from './layouts/PublicLayout';

// Import pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Participants from './pages/participants/Participants';
import Documents from './pages/documents/Documents';
import SilHomes from './pages/sil/SilHomes';
import DynamicDataAdmin from './pages/admin/DynamicData';
import ReferralForm from './pages/participants/Referralform/form';

// Care pages (Kajal's work)
import CareSetup from './pages/participants/Care/CareSetup';
import CarePlanEditor from './pages/participants/Care/CarePlanEditor';
import RiskAssessmentEditor from './pages/participants/Care/RiskAssessmentEditor';
import CareSignOff from './pages/participants/Care/CareSignOff';

// Demo participant ID
const DEMO_PARTICIPANT_ID = "427fb8ab-1378-400d-a397-e5bcfb49fa67";

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/admin/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/referral" element={
              <PublicLayout>
                <ReferralForm />
              </PublicLayout>
            } />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />
            
            {/* Admin Protected Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/participants" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Participants />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/documents" element={
              <ProtectedRoute>
                <AdminLayout>
                  <Documents />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/sil-homes" element={
              <ProtectedRoute>
                <AdminLayout>
                  <SilHomes />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/admin/dynamic-data" element={
              <ProtectedRoute>
                <AdminLayout>
                  <DynamicDataAdmin />
                </AdminLayout>
              </ProtectedRoute>
            } />

            {/* Care Flow Routes (Kajal's work) */}
            <Route path="/care/setup/:participantId" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CareSetup />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/care/plan/:participantId/edit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CarePlanEditor />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/care/risk/:participantId/edit" element={
              <ProtectedRoute>
                <AdminLayout>
                  <RiskAssessmentEditor />
                </AdminLayout>
              </ProtectedRoute>
            } />
            <Route path="/care/signoff/:participantId" element={
              <ProtectedRoute>
                <AdminLayout>
                  <CareSignOff />
                </AdminLayout>
              </ProtectedRoute>
            } />
            
            {/* Default Routes */}
            <Route path="/" element={<Navigate to="/referral" />} />
            <Route path="*" element={<Navigate to="/referral" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;