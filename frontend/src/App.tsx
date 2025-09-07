// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";

// Pages (existing)
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Participants from "./pages/participants/Participants";
import Documents from "./pages/documents/Documents";
import SilHomes from "./pages/sil/SilHomes";
import ReferralForm from "./pages/participants/Referralform/form";

// Care pages (make sure these files export default components)
import CareSetup from "./pages/participants/Care/CareSetup";
import CarePlanEditor from "./pages/participants/Care/CarePlanEditor";
import RiskAssessmentEditor from "./pages/participants/Care/RiskAssessmentEditor";
import CareSignOff from "./pages/participants/Care/CareSignOff";

// 👉 Replace with a real UUID from Supabase -> participants.id
const DEMO_PARTICIPANT_ID = "427fb8ab-1378-400d-a397-e5bcfb49fa67";

// Auth guard
interface ProtectedRouteProps { children: React.ReactNode; }
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();
  return user ? <>{children}</> : <Navigate to="/admin/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route
            path="/referral"
            element={
              <PublicLayout>
                <ReferralForm />
              </PublicLayout>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Login />} />

          {/* Admin area (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/participants"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Participants />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Documents />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sil-homes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <SilHomes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Care flow (protected + admin chrome) */}
          <Route
            path="/care/setup/:participantId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CareSetup />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/care/plan/:participantId/edit"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CarePlanEditor />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/care/risk/:participantId/edit"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <RiskAssessmentEditor />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/care/signoff/:participantId"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CareSignOff />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Defaults */}
          <Route path="/" element={<Navigate to={`/care/setup/${DEMO_PARTICIPANT_ID}`} />} />
          <Route path="*" element={<Navigate to={`/care/setup/${DEMO_PARTICIPANT_ID}`} />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}