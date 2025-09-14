// frontend/src/pages/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <main className="min-h-screen bg-white">
      {/* Header / brand */}
      <header className="w-full border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">NDIS Management</h1>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium border hover:bg-gray-50"
            >
              Staff Login
            </Link>
            <Link
              to="/referral"
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Submit a Referral
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-sm font-medium text-blue-600">Welcome</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI-Driven NDIS Management Platform
            </h2>
            <p className="mt-4 text-gray-600">
              Streamline participant referrals and staff workflows. Use the buttons below to log in as
              staff or submit a new participant referral.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Staff Login
              </Link>
              <Link
                to="/referral"
                className="inline-flex items-center rounded-xl px-5 py-3 text-sm font-semibold border hover:bg-gray-50"
              >
                Submit a Referral
              </Link>
            </div>

            {/* Small reassurance / compliance blurb */}
            <p className="mt-6 text-xs text-gray-500">
              Your information is protected. Only authorised personnel can access submitted referrals.
            </p>
          </div>

          {/* Simple card highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border p-6 shadow-sm">
              <h3 className="font-semibold">For Staff</h3>
              <p className="mt-2 text-sm text-gray-600">
                Secure login and role-based dashboards for managers and workers.
              </p>
            </div>
            <div className="rounded-2xl border p-6 shadow-sm">
              <h3 className="font-semibold">For Participants</h3>
              <p className="mt-2 text-sm text-gray-600">
                Simple referral form to start onboarding and care planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-gray-500">
          © {new Date().getFullYear()} NDIS Management. All rights reserved.
        </div>
      </footer>
    </main>
  );
};

export default Home;