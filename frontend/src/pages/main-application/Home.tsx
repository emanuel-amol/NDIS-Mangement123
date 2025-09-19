// frontend/src/pages/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <main className="min-h-screen bg-white">
      {/* Header / brand */}
      <header className="w-full border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">NDIS Management Platform</h1>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium border hover:bg-gray-50"
            >
              Staff Login
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Register Organisation
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-3 text-sm font-medium text-blue-600">Complete NDIS SaaS Solution</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              AI-Driven NDIS Management System
            </h2>
            <p className="mt-4 text-gray-600">
              Comprehensive cloud-based platform for NDIS service providers. Manage participants, staff, 
              compliance, and service delivery with AI-powered tools and seamless integrations.
            </p>
            
            {/* Action buttons for different user types */}
            <div className="mt-8 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">New NDIS Service Provider?</h3>
                <Link
                  to="/register"
                  className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                >
                  Register Your Organisation
                </Link>
                <p className="mt-1 text-xs text-gray-500">Start with our free trial - no credit card required</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Existing Staff Member?</h3>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold border border-gray-300 hover:bg-gray-50 shadow-sm"
                >
                  Staff Login
                </Link>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Submit a Participant Referral?</h3>
                <Link
                  to="/referral"
                  className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold bg-green-600 text-white hover:bg-green-700 shadow-sm"
                >
                  Submit Referral
                </Link>
              </div>
            </div>

            {/* Compliance and privacy */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-600">
                <strong>Privacy & Compliance:</strong> All data is encrypted and stored securely in Australian data centres. 
                Fully compliant with Australian Privacy Principles and NDIS regulations. Only authorised personnel can access participant information.
              </p>
            </div>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border p-6 shadow-sm bg-blue-50">
              <h3 className="font-semibold text-blue-900">Service Providers</h3>
              <p className="mt-2 text-sm text-blue-700">
                Complete SaaS platform with participant management, HR, rostering, invoicing, and compliance tools.
              </p>
            </div>
            <div className="rounded-2xl border p-6 shadow-sm bg-green-50">
              <h3 className="font-semibold text-green-900">Staff & Workers</h3>
              <p className="mt-2 text-sm text-green-700">
                Role-based dashboards, mobile apps, rostering, timesheets, and AI-powered HR assistance.
              </p>
            </div>
            <div className="rounded-2xl border p-6 shadow-sm bg-purple-50">
              <h3 className="font-semibold text-purple-900">Participants</h3>
              <p className="mt-2 text-sm text-purple-700">
                Streamlined referral process, care planning, goal setting, and communication tools.
              </p>
            </div>
            <div className="rounded-2xl border p-6 shadow-sm bg-orange-50">
              <h3 className="font-semibold text-orange-900">AI Integration</h3>
              <p className="mt-2 text-sm text-orange-700">
                IBM AskHR integration, intelligent module suggestions, and automated compliance reporting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform features overview */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900">Complete NDIS Management Suite</h2>
            <p className="mt-2 text-gray-600">Everything you need to run your NDIS service provider organisation</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">Participant Management</h3>
              <p className="text-sm text-gray-600">Complete lifecycle from referral to service delivery, including care plans, funding, and goal tracking.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">HR Management</h3>
              <p className="text-sm text-gray-600">AI-powered recruitment, onboarding, training, performance management, and payroll integration.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">SIL Home Management</h3>
              <p className="text-sm text-gray-600">Comprehensive management of Supported Independent Living arrangements and properties.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">Rostering & Scheduling</h3>
              <p className="text-sm text-gray-600">Advanced rostering with mobile apps, GPS tracking, and automated timesheet generation.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">Financial Integration</h3>
              <p className="text-sm text-gray-600">Seamless integration with Xero, MYOB, and automated NDIS-compliant invoicing.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="font-semibold mb-2">Compliance & Reporting</h3>
              <p className="text-sm text-gray-600">Automated reporting, incident management, and audit trails for NDIS compliance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing mention */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Flexible Pricing Plans</h2>
          <p className="text-gray-600 mb-6">
            Choose from participant-based, feature-based, or hybrid pricing models that scale with your organisation. 
            Start with our free trial and upgrade as you grow.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center rounded-xl px-8 py-4 text-base font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
          >
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">NDIS Management Platform</h3>
              <p className="text-xs text-gray-600">
                Cloud-based SaaS solution for NDIS service providers across Australia.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Quick Links</h4>
              <div className="space-y-1">
                <Link to="/register" className="block text-xs text-gray-600 hover:text-blue-600">Register Organisation</Link>
                <Link to="/login" className="block text-xs text-gray-600 hover:text-blue-600">Staff Login</Link>
                <Link to="/referral" className="block text-xs text-gray-600 hover:text-blue-600">Submit Referral</Link>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Compliance</h4>
              <p className="text-xs text-gray-600">
                Australian Privacy Principles compliant. NDIS regulation adherent. 
                Data stored in Australian data centres.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t text-center">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} NDIS Management Platform. All rights reserved. 
              Multi-tenant SaaS solution for NDIS service providers.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Home;
