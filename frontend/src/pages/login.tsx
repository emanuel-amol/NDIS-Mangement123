// frontend/src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

type Role = "admin" | "coordinator" | "worker" | "finance";

const roleToPath: Record<Role, string> = {
  admin: "/admin",
  coordinator: "/provider",
  worker: "/worker",
  finance: "/finance",
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("admin");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !role) {
      setError("Select a role and enter email/password.");
      return;
    }
    localStorage.setItem("ndis_role", role);
    navigate(roleToPath[role], { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>

        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-gray-300 p-2"
            >
              <option value="admin">Admin / Manager</option>
              <option value="coordinator">Intake / Coordinator</option>
              <option value="worker">Support Worker</option>
              <option value="finance">Finance / Billing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              placeholder="anything@demo.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              placeholder="anything"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>

          <button type="submit" className="w-full rounded-lg bg-black text-white py-2 font-medium hover:opacity-90">
            Continue
          </button>
        </form>

        <p className="text-xs text-gray-500">Demo mode: any email/password works. Role controls where you land.</p>
      </div>
    </div>
  );
};

export default Login;