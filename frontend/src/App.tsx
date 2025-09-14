// frontend/src/App.tsx - Complete Version with Dynamic Data Routes
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/login";
import AdminDashboard from "./pages/dashboards/admin";
import ProviderDashboard from "./pages/dashboards/provider";
import WorkerDashboard from "./pages/dashboards/worker";
import FinanceDashboard from "./pages/dashboards/finance";

import NDISReferralForm from "./pages/participants/Referralform/form";

// Care Plan Components
import CareSetup from "./pages/participants/Care/CareSetup";
import CarePlanEditor from "./pages/participants/Care/CarePlanEditor";
import RiskAssessmentEditor from "./pages/participants/Care/RiskAssessmentEditor";
import CareSignoff from "./pages/participants/Care/CareSignOff";

// Admin Components
import DynamicDataManagement from "./pages/admin/DynamicDataManagement";

type Role = "admin" | "coordinator" | "worker" | "finance";

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const current = (localStorage.getItem("ndis_role") || "") as Role;
  return current === role ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Public referral form (no auth) */}
        <Route path="/referral" element={<NDISReferralForm />} />

        {/* Dashboards by role */}
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/provider"
          element={
            <RequireRole role="coordinator">
              <ProviderDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/worker"
          element={
            <RequireRole role="worker">
              <WorkerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/finance"
          element={
            <RequireRole role="finance">
              <FinanceDashboard />
            </RequireRole>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/admin/dynamic-data"
          element={
            <RequireRole role="admin">
              <DynamicDataManagement />
            </RequireRole>
          }
        />

        {/* Care Plan Routes - Available to coordinators and admins */}
        <Route
          path="/care/setup/:participantId"
          element={
            <RequireRole role="coordinator">
              <CareSetup />
            </RequireRole>
          }
        />
        <Route
          path="/care/plan/:participantId/edit"
          element={
            <RequireRole role="coordinator">
              <CarePlanEditor />
            </RequireRole>
          }
        />
        <Route
          path="/care/risk/:participantId/edit"
          element={
            <RequireRole role="coordinator">
              <RiskAssessmentEditor />
            </RequireRole>
          }
        />
        <Route
          path="/care/signoff/:participantId"
          element={
            <RequireRole role="coordinator">
              <CareSignoff />
            </RequireRole>
          }
        />

        {/* Admin-only care plan routes */}
        <Route
          path="/admin/care/setup/:participantId"
          element={
            <RequireRole role="admin">
              <CareSetup />
            </RequireRole>
          }
        />
        <Route
          path="/admin/care/plan/:participantId/edit"
          element={
            <RequireRole role="admin">
              <CarePlanEditor />
            </RequireRole>
          }
        />
        <Route
          path="/admin/care/risk/:participantId/edit"
          element={
            <RequireRole role="admin">
              <RiskAssessmentEditor />
            </RequireRole>
          }
        />
        <Route
          path="/admin/care/signoff/:participantId"
          element={
            <RequireRole role="admin">
              <CareSignoff />
            </RequireRole>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}