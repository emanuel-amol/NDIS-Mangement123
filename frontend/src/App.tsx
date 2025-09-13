// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/common/Layout';

// Import pages
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import Participants from './pages/participants/Participants';
import Documents from './pages/documents/Documents';
import SilHomes from './pages/sil/SilHomes';
<<<<<<< HEAD
import DynamicDataAdmin from './pages/admin/DynamicData';
import ReferralForm from './pages/participants/Referralform/form';

// Care pages (Kajal's work)
import CareSetup from './pages/participants/Care/CareSetup';
import CarePlanEditor from './pages/participants/Care/CarePlanEditor';
import RiskAssessmentEditor from './pages/participants/Care/RiskAssessmentEditor';
import CareSignOff from './pages/participants/Care/CareSignOff';

// Demo participant ID
const DEMO_PARTICIPANT_ID = "427fb8ab-1378-400d-a397-e5bcfb49fa67";
=======
import ProviderDashboard from './pages/participants/provider'; 
>>>>>>> 4a06c125fed08545b04515192bc98ba4064d7f3a

// Protected Route component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/participants" element={
              <ProtectedRoute>
                <Layout>
                  <Participants />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/provider/dashboard" element={
              <ProtectedRoute>
                <Layout> 
                  <ProviderDashboard />
                </Layout>
              </ProtectedRoute>
            } /> 
            <Route path="/documents" element={
              <ProtectedRoute>
                <Layout>
                  <Documents />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/sil-homes" element={
              <ProtectedRoute>
                <Layout>
                  <SilHomes />
                </Layout>
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
            
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;