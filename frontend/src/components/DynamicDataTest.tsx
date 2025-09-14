// frontend/src/components/DynamicDataTest.tsx - For debugging API connectivity
import React, { useState } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

export const DynamicDataTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {
      timestamp: new Date().toISOString(),
      tests: []
    };

    // Test 1: Check if backend is reachable
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      results.tests.push({
        name: 'Backend Health Check',
        status: response.ok ? 'PASS' : 'FAIL',
        details: response.ok ? `Status: ${response.status}` : `Failed: ${response.status}`
      });
    } catch (error) {
      results.tests.push({
        name: 'Backend Health Check',
        status: 'FAIL',
        details: `Network error: ${error}`
      });
    }

    // Test 2: Check dynamic data endpoint
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/status`);
      if (response.ok) {
        const data = await response.json();
        results.tests.push({
          name: 'Dynamic Data Status',
          status: 'PASS',
          details: data
        });
      } else {
        results.tests.push({
          name: 'Dynamic Data Status',
          status: 'FAIL',
          details: `Status: ${response.status}`
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Dynamic Data Status',
        status: 'FAIL',
        details: `Error: ${error}`
      });
    }

    // Test 3: Try to load data types
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/data-types`);
      if (response.ok) {
        const data = await response.json();
        results.tests.push({
          name: 'Load Data Types',
          status: 'PASS',
          details: `Found ${data.length} data types`
        });
      } else {
        results.tests.push({
          name: 'Load Data Types',
          status: 'FAIL',
          details: `Status: ${response.status}`
        });
      }
    } catch (error) {
      results.tests.push({
        name: 'Load Data Types',
        status: 'FAIL',
        details: `Error: ${error}`
      });
    }

    // Test 4: Try to load specific data points
    const testDataTypes = ['disability_types', 'contact_methods', 'service_types'];
    for (const dataType of testDataTypes) {
      try {
        const response = await fetch(`${API_BASE_URL}/dynamic-data/data-types/${dataType}/points`);
        if (response.ok) {
          const data = await response.json();
          results.tests.push({
            name: `Load ${dataType}`,
            status: 'PASS',
            details: `Found ${data.length} points`
          });
        } else {
          results.tests.push({
            name: `Load ${dataType}`,
            status: 'FAIL',
            details: `Status: ${response.status}`
          });
        }
      } catch (error) {
        results.tests.push({
          name: `Load ${dataType}`,
          status: 'FAIL',
          details: `Error: ${error}`
        });
      }
    }

    setTestResults(results);
    setLoading(false);
  };

  const initializeData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dynamic-data/initialize`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        alert('Data initialization successful! ' + data.message);
        // Re-run tests after initialization
        await runTests();
      } else {
        alert(`Data initialization failed: ${response.status}`);
      }
    } catch (error) {
      alert(`Data initialization error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Dynamic Data API Test</h3>
      
      <div className="flex gap-3 mb-4">
        <button
          onClick={runTests}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Run API Tests'}
        </button>
        
        <button
          onClick={initializeData}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Initialize Data
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        API Base URL: <code className="bg-gray-100 px-2 py-1 rounded">{API_BASE_URL}</code>
      </p>

      {testResults && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Test Results:</h4>
          <div className="space-y-2">
            {testResults.tests.map((test: any, index: number) => (
              <div 
                key={index}
                className={`p-3 rounded ${
                  test.status === 'PASS' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{test.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    test.status === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(test.details, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Test completed at: {testResults.timestamp}
          </div>
        </div>
      )}
    </div>
  );
};