export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">Access Restricted</h1>
        <p className="text-gray-600 mb-6">
          You do not have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
