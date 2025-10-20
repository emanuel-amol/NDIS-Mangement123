import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NavigationBar from "../../components/navigation/NavigationBar";

type AdminMetrics = { candidates: number; users: number; training: number };

const DashboardHRM: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch("/api/v1/admin/metrics", { credentials: "include" });
        if (resp.ok) {
          const data: AdminMetrics = await resp.json();
          setMetrics(data);
        }
      } catch (e) {
        // swallow for now; could add toast later
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationBar />
      <div className="flex-1 overflow-auto bg-[#e7eaf0] p-4 pt-[24px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
            <span className="text-sm mb-2">Applicants</span>
            <span className="text-2xl font-bold flex items-center gap-2">{loading ? "…" : (metrics?.candidates ?? 0)}</span>
          </div>
          <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
            <span className="text-sm mb-2">Workers</span>
            <span className="text-2xl font-bold flex items-center gap-2">{loading ? "…" : (metrics?.users ?? 0)}</span>
          </div>
          <div className="bg-gray-100 rounded-lg p-6 flex flex-col items-start">
            <span className="text-sm mb-2">Training Session</span>
            <span className="text-2xl font-bold flex items-center gap-2">{loading ? "…" : (metrics?.training ?? 0)}</span>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/applicants" className="block hover:bg-gray-100 p-2 rounded-lg transition">
          <div className="bg-gray-100 rounded-lg p-6 flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
            <div>
              <div className="font-medium">View All Applicants</div>
              <div className="text-xs text-gray-500">All Applicants in the Hiring Pipeline</div>
            </div>
          </div>
        </Link>

        <Link to="/admin/users" className="block hover:bg-gray-100 p-2 rounded-lg transition">
          <div className="bg-gray-100 rounded-lg p-6 flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
            <div>
              <div className="font-medium">View All Staffs</div>
              <div className="text-xs text-gray-500">Manage staffs on the system</div>
            </div>
          </div>
        </Link>

        <Link to="/training" className="block hover:bg-gray-100 p-2 rounded-lg transition">
          <div className="bg-gray-100 rounded-lg p-6 flex items-center">
            <div className="w-12 h-12 bg-gray-200 rounded mr-4"></div>
            <div>
              <div className="font-medium">View All Training Session</div>
              <div className="text-xs text-gray-500">Manage training programme</div>
            </div>
          </div>
        </Link>
      </div>
      </div>
    </div>
  );
};

export default DashboardHRM;