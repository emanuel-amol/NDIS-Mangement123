import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">NDIS Connect</h1>
              <p className="ml-4 text-gray-600">Supporting Your Journey</p>
            </div>
            <div className="text-sm text-gray-500">
              Need help? Call: 1800 XXX XXX
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h3>
              <p className="text-gray-600">Phone: 1800 XXX XXX</p>
              <p className="text-gray-600">Email: referrals@ndisconnect.com.au</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Office Hours</h3>
              <p className="text-gray-600">Monday - Friday: 9:00 AM - 5:00 PM</p>
              <p className="text-gray-600">Saturday: 9:00 AM - 1:00 PM</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About NDIS</h3>
              <p className="text-gray-600 text-sm">
                The National Disability Insurance Scheme (NDIS) provides support 
                to people with permanent and significant disability.
              </p>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-gray-500">
            <p>&copy; 2025 NDIS Connect. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;