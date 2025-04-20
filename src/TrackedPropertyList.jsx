import React, { useEffect, useState } from 'react';
import FloodRiskMap from './FloodRisk';
import { PropertyClimateRisks } from './PropertyClimateRisk';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Droplet, Flame, AlertTriangle, Gauge } from 'lucide-react';

export function TrackedPropertyList() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scenario, setScenario] = useState('current');

  const loadProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching properties...");
      const res = await fetch('http://localhost:8000/properties');
      
      if (!res.ok) {
        throw new Error(`API returned status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Properties fetched:", data);
      setProperties(data);
    } catch (err) {
      console.error("Error loading properties:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (id) => {
    if (!id) {
      console.error("deleteProperty: Missing ID");
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/properties/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Delete failed: ${res.status}`);
      }
      console.log("Deleted successfully");
      loadProperties(); // refresh
    } catch (err) {
      console.error("Error deleting property:", err);
    }
  };
  
  useEffect(() => {
    loadProperties();
  }, []);

  // Custom UI components
  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/3"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );

  const NoPropertiesMessage = () => (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md flex items-start">
      <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
      <div>
        <h4 className="font-medium">No Properties Found</h4>
        <p className="text-sm">Add a property using the registration form above to begin tracking climate risks.</p>
      </div>
    </div>
  );

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
      <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
      <div>
        <h4 className="font-medium">Error Loading Properties</h4>
        <p className="text-sm">{message}</p>
        <button 
          onClick={loadProperties}
          className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Tracked Properties</h2>
        <button 
          onClick={loadProperties}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
        >
          <span className="mr-1">↻</span> Refresh
        </button>
      </div>
      
      {loading && <Skeleton />}
      {error && <ErrorMessage message={error} />}
      
      {!loading && !error && properties.length === 0 && <NoPropertiesMessage />}
      
      {properties.map((p) => (
        <div key={p.id} className="border rounded-lg overflow-hidden shadow bg-white">
          <div className="bg-gray-50 p-4 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-blue-700">{p.name}</h3>
                <div className="text-sm text-gray-600">{p.address}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Coordinates: {p.latitude}, {p.longitude}
                </div>
                {p.notes && (
                  <div className="text-xs text-gray-500 mt-1">
                    Notes: {p.notes}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert(`Edit functionality would go here for property ${p.id}`)}
                  className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteProperty(p.id)}
                  className="px-3 py-1 bg-red-50 text-red-600 text-sm rounded hover:bg-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
          
          {p.latitude && p.longitude ? (
            <div className="p-4">
              <Tabs defaultValue="climate-risks">
                <TabsList className="mb-4">
                  <TabsTrigger value="climate-risks" className="flex items-center">
                    <Gauge className="h-4 w-4 mr-1" />
                    Multi-Hazard Risk Assessment
                  </TabsTrigger>
                  <TabsTrigger value="flood-risk" className="flex items-center">
                    <Droplet className="h-4 w-4 mr-1" />
                    Flood Risk Explorer
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="climate-risks">
                  <PropertyClimateRisks lat={p.latitude} lon={p.longitude} />
                </TabsContent>
                
                <TabsContent value="flood-risk">
                  <FloodRiskMap lat={p.latitude} lon={p.longitude} scenario={scenario} />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>Missing coordinates for this property.</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default TrackedPropertyList;