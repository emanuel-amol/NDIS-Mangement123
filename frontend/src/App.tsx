// src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/login";
import AdminDashboard from "./pages/dashboards/admin";
import ProviderDashboard from "./pages/dashboards/provider";
import WorkerDashboard from "./pages/dashboards/worker";
import FinanceDashboard from "./pages/dashboards/finance";

import NDISReferralForm from "./pages/participants/Referralform/form";

import CareSetup from "./pages/participants/Care/CareSetup";
import CarePlanEditor from "./pages/participants/Care/CarePlanEditor";
import CareSignoff from "./pages/participants/Care/CareSignOff";
import RiskAssessmentEditor from "./pages/participants/Care/RiskAssessmentEditor";


type Role = "admin" | "coordinator" | "worker" | "finance";

function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const current = (localStorage.getItem("ndis_role") || "") as Role;
  return current === role ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Public referral form - no authentication required */}
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

        

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}