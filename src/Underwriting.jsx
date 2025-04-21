import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  AlertOctagon, Droplet, Wind, Umbrella, Thermometer, Info,
  Filter, RefreshCw, Download, Search
} from 'lucide-react';
import  TrackedPropertyList from './TrackedPropertyList';
import UploadPropertyCSV from './UploadPropertyCSV';
import RegisterPropertyForm from './RegisterPropertyForm';
import FloodRiskMap from './FloodRisk';
import PropertyDashboard from './PropertyDashboard';
const API_BASE_URL = 'http://localhost:8000';
const HAZARD_TYPES = ['all', 'flood', 'hurricane', 'wildfire', 'drought', 'storm'];
const REGIONS = ['all', 'north_america', 'europe', 'asia_pacific', 'global'];





export default function UnderwritingCoverageAnalysis() {
  // Add this near the top of the UnderwritingCoverageAnalysis component
  const [refresh, setRefresh] = useState(false);
  const reload = () => setRefresh(prev => !prev);
  const [activeTab, setActiveTab] = useState('underwriting');
  const [filters, setFilters] = useState({ hazard: 'all', region: 'all', search: '' });
  const [data, setData] = useState({ challenges: [], coverage: [], hazards: [] });
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.hazard !== 'all') params.append('hazard_type', filters.hazard);
      if (filters.region !== 'all') params.append('region', filters.region);

      const [uRes, cRes, hRes] = await Promise.all([
        fetch(`${API_BASE_URL}/underwriting/challenges?${params}`),
        fetch(`${API_BASE_URL}/underwriting/coverage-gaps?${params}`),
        fetch(`${API_BASE_URL}/hazards/active`)
      ]);
      if (!uRes.ok || !cRes.ok || !hRes.ok) throw new Error();

      const [challenges, coverage, hazards] = await Promise.all([
        uRes.json(), cRes.json(), hRes.json()
      ]);
      setData({ challenges, coverage, hazards });
    } catch {
      setError('Unable to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filters.hazard, filters.region]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await fetch(`${API_BASE_URL}/admin/generate-underwriting-challenges`, { method: 'POST' });
      setTimeout(fetchAll, 3000);
    } catch {
      setError('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };
  const filteredChallenges = data.challenges
    .filter(c => filters.hazard === 'all' || c.hazard_type === filters.hazard)
    .filter(c => filters.region === 'all' || c.region === filters.region)
    .filter(c => c.challenge.toLowerCase().includes(filters.search.toLowerCase()));
  return (
    <div className="p-6 space-y-6">
      {/* Header + Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'underwriting' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('underwriting')}>Challenges</button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'coverage' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('coverage')}>Coverage Gap</button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'hazards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('hazards')}>Active Hazards</button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'tracked' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('tracked')}>Tracked Properties</button>
        {/* Add this new button for the Enterprise Dashboard */}
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'enterprise' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('enterprise')}>Enterprise Dashboard</button>
        
        <div className="flex-1 h-10 relative">
          <Search className="absolute left-2 top-2 text-gray-400" />
          <input
            placeholder="Search challenges..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-8 pr-4 py-2 border rounded w-full"
          />
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          {regenerating ? <RefreshCw className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />} Refresh AI
        </button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {/* *Add this new condition for the enterprise dashboard {activeTab === 'enterprise' && (  <PropertyDashboard /> )}*/}

      {/* Keep all your existing conditions */}
      {activeTab === 'tracked' && (
        <div className="space-y-6">
          <UploadPropertyCSV onUploadComplete={reload} />
          <RegisterPropertyForm onSuccess={reload} />
          <TrackedPropertyList key={refresh} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'underwriting' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('underwriting')}>Challenges</button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'coverage' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('coverage')}>Coverage Gap</button>
        <button
          className={`px-4 py-2 font-medium ${activeTab === 'hazards' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          onClick={() => setActiveTab('hazards')}>Active Hazards</button>
        
        <button
  className={`px-4 py-2 font-medium ${activeTab === 'tracked' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
  onClick={() => setActiveTab('tracked')}
>
  Tracked Properties
</button>
<div className="flex-1 h-10 relative">
          <Search className="absolute left-2 top-2 text-gray-400" />
          <input
            placeholder="Search challenges..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-8 pr-4 py-2 border rounded w-full"
          />
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          {regenerating ? <RefreshCw className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />} Refresh AI
        </button>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {/* Content */}
      {activeTab === 'tracked' && (
  <div className="space-y-6">
    <UploadPropertyCSV onUploadComplete={reload} />
    <RegisterPropertyForm onSuccess={reload} />
    <TrackedPropertyList key={refresh} />
  </div>
)}

      {activeTab === 'underwriting' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-10">Loading...</div>
          ) : filteredChallenges.map((c, i) => (
            <div 
              key={i} 
              className="border rounded-lg p-4 shadow hover:shadow-lg transition cursor-pointer"
              onClick={() => {
                // If there's a source URL, open it
                if (c.source_url) {
                  window.open(c.source_url, '_blank');
                } else if (c.source && c.date) {
                  // If no direct URL, search for the source and date
                  const searchQuery = `${c.source} ${c.date} ${c.challenge}`;
                  window.open(`/search?query=${encodeURIComponent(searchQuery)}`, '_blank');
                }
              }}
            >
              <div className="flex justify-between items-start">
                <h4 className="font-semibold mb-2 text-blue-600 hover:underline group">
                  {c.challenge}
                  <span className="ml-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">🔗</span>
                </h4>
              </div>
              <div className="flex items-center text-sm text-gray-600 space-x-2 mb-2">
                <span className="px-2 py-1 bg-gray-100 rounded">{c.hazard_type}</span>
                <span className="px-2 py-1 bg-gray-100 rounded">{c.region}</span>
                <span className={`px-2 py-1 rounded ${
                  c.impact_level === 'High' ? 'bg-red-100 text-red-800' :
                  c.impact_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {c.impact_level}
                </span>
              </div>
              <p className="text-gray-700 mb-2">{c.business_implications}</p>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className="hover:text-blue-600">{c.source}</span>
                <span>{c.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'coverage' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium mb-4">Coverage Gap (%) by Hazard</h3>
          {loading ? <div className="text-center py-10">Loading...</div> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.coverage} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hazard_type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="coverage_gap_percentage" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
      {activeTab === 'flood' && (
  <div className="bg-white p-6 rounded-lg shadow">
    {/* Pass coordinates — for now, hardcoded to Miami */}
    <FloodRiskMap lat={25.7617} lon={-80.1918} />
  </div>
)}

      {activeTab === 'hazards' && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-medium mb-4">Active Climate Hazards</h3>
          {loading ? <div className="text-center py-10">Loading...</div> : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.hazards.map((h,i) => (
                <li key={i} className="flex justify-between p-2 border rounded hover:bg-gray-50">
                  <div className="flex items-center space-x-2">
                    {h.hazard_type === 'flood' && <Droplet />} 
                    {h.hazard_type === 'hurricane' && <Wind />} 
                    {h.hazard_type === 'wildfire' && <AlertOctagon />} 
                    {h.hazard_type === 'drought' && <Thermometer />} 
                    {h.hazard_type === 'storm' && <Umbrella />} 
                    {h.hazard_type === 'other' && <Info />} 
                    <span className="font-medium">{h.title}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">{h.severity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}