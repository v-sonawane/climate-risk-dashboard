import React, { useState, useEffect } from 'react';
import { AlertTriangle, Database, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';

const ClimateDataManagementPanel = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [statusType, setStatusType] = useState(null); // 'success', 'error', 'warning', 'info'
  const [collections, setCollections] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchDataStatus();
  }, []);

  const fetchDataStatus = async () => {
    try {
      // Ideally, you'd have an API endpoint to get this info
      // For now, we'll check the data counts from various endpoints
      const endpoints = [
        { name: 'Regulatory Frameworks', url: '/regulatory/frameworks' },
        { name: 'ESG Impacts', url: '/regulatory/esg-impacts' },
        { name: 'Underwriting Challenges', url: '/underwriting/challenges' },
        { name: 'Coverage Gaps', url: '/underwriting/coverage-gaps' }
      ];

      const collectionsData = [];
      let updateTimestamp = null;

      for (const endpoint of endpoints) {
        const response = await fetch(`${API_BASE_URL}${endpoint.url}`);
        if (response.ok) {
          const data = await response.json();
          collectionsData.push({
            name: endpoint.name,
            count: Array.isArray(data) ? data.length : 0,
            status: 'Available',
            lastUpdated: null // In a real system, you'd get this from metadata
          });
        } else {
          collectionsData.push({
            name: endpoint.name,
            count: 0,
            status: 'Error',
            lastUpdated: null
          });
        }
      }

      // Try to get the last report generation date as proxy for data freshness
      try {
        const reportResponse = await fetch(`${API_BASE_URL}/reports/latest`);
        if (reportResponse.ok) {
          const reportData = await reportResponse.json();
          if (reportData && reportData.generated_date) {
            updateTimestamp = reportData.generated_date;
          }
        }
      } catch (error) {
        console.error("Error fetching report data:", error);
      }

      setCollections(collectionsData);
      setLastUpdate(updateTimestamp);
    } catch (error) {
      console.error("Error fetching data status:", error);
      setMessage("Failed to fetch data status");
      setStatusType("error");
    }
  };

  const triggerDataPopulation = async () => {
    setIsLoading(true);
    setMessage("Starting data population process...");
    setStatusType("info");

    try {
      const response = await fetch(`${API_BASE_URL}/admin/populate-climate-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || "Data population started successfully! This process runs in the background and may take a few minutes.");
        setStatusType("success");
        
        // Start polling for updates
        setTimeout(fetchDataStatus, 30000); // Check again after 30 seconds
      } else {
        const errorData = await response.json();
        setMessage(errorData.detail || "Failed to start data population");
        setStatusType("error");
      }
    } catch (error) {
      console.error("Error triggering data population:", error);
      setMessage("Failed to connect to the server");
      setStatusType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            <Database className="h-5 w-5 mr-2 text-blue-600" />
            Climate Risk Data Management
          </h2>
          <button
            onClick={triggerDataPopulation}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate AI Data
              </>
            )}
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${
            statusType === 'success' ? 'bg-green-50 text-green-800' :
            statusType === 'error' ? 'bg-red-50 text-red-800' :
            statusType === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            <div className="flex">
              <div className="flex-shrink-0">
                {statusType === 'success' && <CheckCircle className="h-5 w-5 text-green-400" />}
                {statusType === 'error' && <XCircle className="h-5 w-5 text-red-400" />}
                {statusType === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                {statusType === 'info' && <Clock className="h-5 w-5 text-blue-400" />}
              </div>
              <div className="ml-3">
                <p>{message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Data Collections Status</h3>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {collections.map((collection, idx) => (
                <div key={idx} className="border rounded-md p-4 bg-white">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">{collection.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      collection.status === 'Available' && collection.count > 0 ? 'bg-green-100 text-green-800' :
                      collection.status === 'Available' && collection.count === 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {collection.status === 'Available' && collection.count > 0 ? 'Available' :
                       collection.status === 'Available' && collection.count === 0 ? 'Empty' :
                       'Error'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <div className="flex justify-between">
                      <span>Records:</span>
                      <span className="font-semibold">{collection.count}</span>
                    </div>
                    {collection.lastUpdated && (
                      <div className="flex justify-between mt-1">
                        <span>Last updated:</span>
                        <span>{collection.lastUpdated}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Data Freshness</h3>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Last data update</div>
                <div className="text-lg font-semibold">
                  {lastUpdate ? lastUpdate : 'No update information available'}
                </div>
              </div>
              <button
                onClick={fetchDataStatus}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh Status
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-medium mb-2">How AI Data Generation Works</h3>
          <div className="prose prose-sm max-w-none text-gray-600">
            <p>
              The AI data generation process uses Claude to analyze climate risk articles and extract structured 
              information for the dashboard. The process:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Scrapes and analyzes recent climate risk news articles</li>
              <li>Uses AI to extract regulatory frameworks, ESG impacts, underwriting challenges, and coverage gaps</li>
              <li>Structures the data for visualization in the dashboard</li>
              <li>Stores the data in the database for access through the API</li>
            </ol>
            <p className="mt-2">
              This process runs automatically each day, but you can also trigger it manually using the button above.
              The complete process may take several minutes to complete.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClimateDataManagementPanel;