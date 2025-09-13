// frontend/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/home";
import Login from "./pages/login";
import AdminDashboard from "./pages/dashboards/admin";
import ProviderDashboard from "./pages/dashboards/provider";
import WorkerDashboard from "./pages/dashboards/worker";
import FinanceDashboard from "./pages/dashboards/finance";

import NDISReferralForm from "./pages/participants/Referralform/form";

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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}