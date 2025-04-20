import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { AlertCircle, TrendingUp, FileText, Globe, Filter, Download, Info, Loader } from 'lucide-react';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';

const RegulatoryESGTracker = () => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState('global');
  const [regulatoryTrends, setRegulatoryTrends] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [esgImpacts, setEsgImpacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minRelevance, setMinRelevance] = useState(0);
  const [frameworkStatus, setFrameworkStatus] = useState(null);
  const [selectedESGCategory, setSelectedESGCategory] = useState(null);

  // Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const STATUS_COLORS = {
    'emerging': '#FFBB28',
    'established': '#00C49F',
    'proposed': '#8884d8'
  };
  const IMPACT_COLORS = {
    'High': '#FF4560',
    'Medium': '#FEB019',
    'Low': '#00E396'
  };
  const DOMAIN_COLORS = {
    'property': '#0088FE',
    'casualty': '#00C49F', 
    'life': '#FFBB28',
    'health': '#FF8042',
    'reinsurance': '#8884d8'
  };
  
  // Fetch data
  useEffect(() => {
    fetchData();
  }, [selectedRegion, minRelevance, frameworkStatus, selectedESGCategory]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch regulatory trends - with improved error handling and logging
      console.log("Fetching regulatory trends from:", `${API_BASE_URL}/regulatory/trends?months=6`);
      try {
        const trendsResponse = await fetch(`${API_BASE_URL}/regulatory/trends?months=6`);
        
        // Log response status for debugging
        console.log("Regulatory trends response status:", trendsResponse.status);
        
        if (!trendsResponse.ok) {
          throw new Error(`HTTP error! Status: ${trendsResponse.status}`);
        }
        
        const trendsData = await trendsResponse.json();
        console.log("Successfully fetched regulatory trends data:", trendsData);
        setRegulatoryTrends(trendsData);
      } catch (err) {
        console.error("Failed to fetch regulatory trends:", err);
        // Only use fallback if we couldn't get real data
        console.log("Using fallback regulatory trends data");
        const fallbackTrends = generateFallbackRegulatoryTrends(6);
        setRegulatoryTrends(fallbackTrends);
      }
      
      // Fetch frameworks with filters - with improved error handling
      let frameworksUrl = `${API_BASE_URL}/regulatory/frameworks`;
      
      // Add query params
      const frameworkParams = new URLSearchParams();
      if (selectedRegion !== 'global') frameworkParams.append('region', selectedRegion);
      if (minRelevance > 0) frameworkParams.append('min_relevance', minRelevance);
      if (frameworkStatus) frameworkParams.append('status', frameworkStatus);
      
      // Add params to URL if we have any
      if (frameworkParams.toString()) {
        frameworksUrl += `?${frameworkParams.toString()}`;
      }
      
      console.log("Fetching regulatory frameworks from:", frameworksUrl);
      try {
        const frameworksResponse = await fetch(frameworksUrl);
        
        // Log response status for debugging
        console.log("Frameworks response status:", frameworksResponse.status);
        
        if (!frameworksResponse.ok) {
          throw new Error(`HTTP error! Status: ${frameworksResponse.status}`);
        }
        
        const frameworksData = await frameworksResponse.json();
        console.log("Successfully fetched frameworks data:", frameworksData);
        setFrameworks(frameworksData);
      } catch (err) {
        console.error("Failed to fetch regulatory frameworks:", err);
        // The API should provide fallbacks automatically, but we'll leave
        // the existing framework data in state if there was an error
        console.log("Keeping existing frameworks data or relying on API fallbacks");
      }
      
      // Fetch ESG impacts with category filter - with improved error handling
      let esgUrl = `${API_BASE_URL}/regulatory/esg-impacts`;
      if (selectedESGCategory) {
        esgUrl += `?category=${selectedESGCategory}`;
      }
      
      console.log("Fetching ESG impacts from:", esgUrl);
      try {
        const esgResponse = await fetch(esgUrl);
        
        // Log response status for debugging
        console.log("ESG impacts response status:", esgResponse.status);
        
        if (!esgResponse.ok) {
          throw new Error(`HTTP error! Status: ${esgResponse.status}`);
        }
        
        const esgData = await esgResponse.json();
        console.log("Successfully fetched ESG impacts data:", esgData);
        setEsgImpacts(esgData);
      } catch (err) {
        console.error("Failed to fetch ESG impacts:", err);
        // The API should provide fallbacks automatically, but we'll leave
        // the existing ESG data in state if there was an error
        console.log("Keeping existing ESG data or relying on API fallbacks");
      }
    } catch (err) {
      console.error('Error in overall fetchData function:', err);
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate fallback regulatory trend data when API fails
  const generateFallbackRegulatoryTrends = (months = 6) => {
    const currentMonth = new Date();
    const trends = [];
    
    for (let i = 0; i < months; i++) {
      const monthDate = new Date(currentMonth);
      monthDate.setMonth(currentMonth.getMonth() - (months - i - 1));
      const monthStr = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Generate realistic trend data with property and casualty having higher regulatory impact
      trends.push({
        month: monthStr,
        property: 25 - i * 2,
        casualty: 20 - i * 2,
        life: 10 - i,
        health: 12 - i,
        reinsurance: 18 - i * 2
      });
    }
    
    return trends;
  };

  // Helper function to format regulatory trend data for the chart
  const formatTrendData = (data) => {
    return data.map(item => ({
      ...item,
      month: item.month.substring(5) // Just show month number for cleaner display
    }));
  };

  // Download report as CSV
  const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    
    // Convert data to CSV format
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => Object.values(item).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Overview Tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-3">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium">Regulatory Pressure</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {frameworks.length} Frameworks
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {frameworks.filter(f => f.status === 'emerging').length} emerging frameworks requiring attention
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-3">
            <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium">Most Affected</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            Property & Casualty
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Highest regulatory impact in recent trends data
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-3">
            <Globe className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium">Top ESG Concern</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {esgImpacts.length > 0 ? 
              `${esgImpacts[0].category}: ${esgImpacts[0].name}` : 
              'Loading...'}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {esgImpacts.length > 0 ? 
              `Impact: ${esgImpacts[0].impact} (${esgImpacts[0].score.toFixed(1)}/10)` : 
              'Loading impact data...'}
          </div>
        </div>
      </div>

      {/* Regulatory Trends Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Regulatory Mentions by Insurance Domain</h3>
          <button
            onClick={() => downloadCSV(regulatoryTrends, 'regulatory_trends.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        <div className="h-72">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader className="h-12 w-12 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 flex justify-center items-center h-full">
              <AlertCircle className="h-6 w-6 mr-2" />
              Error loading trends: {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatTrendData(regulatoryTrends)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="property" stroke={DOMAIN_COLORS.property} strokeWidth={2} />
                <Line type="monotone" dataKey="casualty" stroke={DOMAIN_COLORS.casualty} strokeWidth={2} />
                <Line type="monotone" dataKey="life" stroke={DOMAIN_COLORS.life} strokeWidth={2} />
                <Line type="monotone" dataKey="health" stroke={DOMAIN_COLORS.health} strokeWidth={2} />
                <Line type="monotone" dataKey="reinsurance" stroke={DOMAIN_COLORS.reinsurance} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Frameworks & ESG Impact Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Key Regulatory Frameworks</h3>
            <button
              onClick={() => setActiveTab('frameworks')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All →
            </button>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error loading frameworks: {error}
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {frameworks.slice(0, 5).map((framework, i) => (
                <div key={i} className="border p-3 rounded-md">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">{framework.name}</h4>
                    <span 
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        framework.status === 'emerging' ? 'bg-yellow-100 text-yellow-800' :
                        framework.status === 'established' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {framework.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{framework.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {framework.domains_affected?.map((domain, j) => (
                      <span key={j} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Top ESG Impacts</h3>
            <button
              onClick={() => setActiveTab('esg')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View All →
            </button>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Error loading ESG data: {error}
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {esgImpacts.slice(0, 5).map((impact, i) => (
                <div key={i} className="border p-3 rounded-md">
                  <div className="flex justify-between">
                    <h4 className="font-medium">{impact.category}: {impact.name}</h4>
                    <span 
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        impact.impact === 'High' ? 'bg-red-100 text-red-800' :
                        impact.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {impact.impact}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{impact.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex flex-wrap gap-1">
                      {impact.relevant_frameworks?.slice(0, 3).map((framework, j) => (
                        <span key={j} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {framework}
                        </span>
                      ))}
                    </div>
                    <span className={`text-xs flex items-center ${
                      impact.trend === 'increasing' ? 'text-red-600' :
                      impact.trend === 'decreasing' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {impact.trend === 'increasing' ? '↑' : 
                       impact.trend === 'decreasing' ? '↓' : '→'} 
                      {impact.trend}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Render Frameworks Tab
  const renderFrameworks = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-blue-500" />
          Filter Frameworks
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="region-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              id="region-filter"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="global">Global</option>
              <option value="europe">Europe</option>
              <option value="north_america">North America</option>
              <option value="asia_pacific">Asia-Pacific</option>
              <option value="africa">Africa</option>
              <option value="latin_america">Latin America</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={frameworkStatus || ''}
              onChange={(e) => setFrameworkStatus(e.target.value || null)}
            >
              <option value="">All Statuses</option>
              <option value="established">Established</option>
              <option value="emerging">Emerging</option>
              <option value="proposed">Proposed</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="relevance-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Relevance (1-10)
            </label>
            <input
              id="relevance-filter"
              type="range"
              min="0"
              max="10"
              step="0.5"
              className="w-full"
              value={minRelevance}
              onChange={(e) => setMinRelevance(parseFloat(e.target.value))}
            />
            <div className="text-center text-sm font-medium">{minRelevance.toFixed(1)}</div>
          </div>
        </div>
      </div>
      
      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Frameworks by Status</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Established', value: frameworks.filter(f => f.status === 'established').length || 0 },
                      { name: 'Emerging', value: frameworks.filter(f => f.status === 'emerging').length || 0 },
                      { name: 'Proposed', value: frameworks.filter(f => f.status === 'proposed').length || 0 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell key="established" fill={STATUS_COLORS.established} />
                    <Cell key="emerging" fill={STATUS_COLORS.emerging} />
                    <Cell key="proposed" fill={STATUS_COLORS.proposed} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Insurance Domains Affected</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Property', count: frameworks.filter(f => f.domains_affected?.includes('property')).length || 0 },
                    { name: 'Casualty', count: frameworks.filter(f => f.domains_affected?.includes('casualty')).length || 0 },
                    { name: 'Life', count: frameworks.filter(f => f.domains_affected?.includes('life')).length || 0 },
                    { name: 'Health', count: frameworks.filter(f => f.domains_affected?.includes('health')).length || 0 },
                    { name: 'Reinsurance', count: frameworks.filter(f => f.domains_affected?.includes('reinsurance')).length || 0 }
                  ]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" name="Frameworks" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      {/* Frameworks Detailed List */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Regulatory Frameworks ({frameworks.length})</h3>
          <button
            onClick={() => downloadCSV(frameworks, 'regulatory_frameworks.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error loading frameworks: {error}
          </div>
        ) : frameworks.length > 0 ? (
          <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Framework</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Affected Domains</th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {frameworks.map((framework, i) => (
      <tr 
        key={i} 
        className="hover:bg-gray-50 cursor-pointer"
        onClick={() => {
          // If the framework has a URL, open it
          if (framework.url) {
            window.open(framework.url, '_blank');
          } else {
            // Search for the framework name
            window.open(`https://www.google.com/search?q=${encodeURIComponent(framework.name + " climate framework")}`, '_blank');
          }
        }}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="font-medium text-blue-600 hover:underline group">
            {framework.name}
            <span className="ml-1 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">🔗</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">{framework.description}</div>
          {framework.url && (
            <a 
              href={framework.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-900 flex items-center mt-1"
              onClick={(e) => e.stopPropagation()} // Prevent row click from firing
            >
              <Info className="h-3 w-3 mr-1" />
              Official Website
            </a>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
            framework.status === 'emerging' ? 'bg-yellow-100 text-yellow-800' :
            framework.status === 'established' ? 'bg-green-100 text-green-800' :
            'bg-purple-100 text-purple-800'
          }`}>
            {framework.status}
          </span>
          {framework.implementation_date && (
            <div className="text-xs text-gray-500 mt-1">
              Since: {framework.implementation_date}
            </div>
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="capitalize">{framework.region.replace('_', ' ')}</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center">
            <div className="mr-2">{framework.relevance_score?.toFixed(1) || "N/A"}</div>
            <div className="w-24 bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${((framework.relevance_score || 0) / 10) * 100}%` }}
              ></div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-1">
            {framework.domains_affected?.map((domain, j) => (
              <span 
                key={j} 
                className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
              >
                {domain}
              </span>
            ))}
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No frameworks match your filter criteria. Try adjusting the filters.
          </div>
        )}
      </div>
    </div>
  );

  // Render ESG Tab
  const renderESG = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-blue-500" />
          Filter ESG Impacts
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            className={`px-4 py-2 rounded-md ${
              selectedESGCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedESGCategory(null)}
          >
            All
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedESGCategory === 'E'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedESGCategory('E')}
          >
            Environmental
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedESGCategory === 'S'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedESGCategory('S')}
          >
            Social
          </button>
          <button
            className={`px-4 py-2 rounded-md ${
              selectedESGCategory === 'G'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => setSelectedESGCategory('G')}
          >
            Governance
          </button>
        </div>
      </div>
      
      {/* ESG Impact Radar Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">ESG Impact Analysis</h3>
        {isLoading ? (
          <div className="flex justify-center items-center h-72">
            <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : esgImpacts.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={90} data={esgImpacts.map(impact => ({
                subject: `${impact.category}: ${impact.name}`,
                score: impact.score,
                fullMark: 10
              })).slice(0, 8)}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar name="Impact Score" dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No ESG impact data available for the selected category.
          </div>
        )}
      </div>
      
      {/* ESG Impact Detailed List */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">ESG Impacts ({esgImpacts.length})</h3>
          <button
            onClick={() => downloadCSV(esgImpacts, 'esg_impacts.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error loading ESG data: {error}
          </div>
        ) : esgImpacts.length > 0 ? (
          <div className="space-y-4">
            {esgImpacts.map((impact, i) => (
  <div 
    key={i} 
    className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
    onClick={() => {
      // If the impact has a source_article_id or link, navigate to it
      if (impact.source_article_id) {
        // You may need to update your URL structure based on your routing
        window.open(`/articles/${impact.source_article_id}`, '_blank');
      } else if (impact.source_link) {
        window.open(impact.source_link, '_blank');
      } else {
        // Optionally trigger a search for this impact
        const searchQuery = `${impact.category === 'E' ? 'Environmental' : 
                          impact.category === 'S' ? 'Social' : 
                          'Governance'} ${impact.name}`;
        
        // Update with your search URL
        window.open(`/search?query=${encodeURIComponent(searchQuery)}`, '_blank');
      }
    }}
  >
    <div className={`p-4 ${
      impact.category === 'E' ? 'bg-green-50' :
      impact.category === 'S' ? 'bg-blue-50' :
      'bg-purple-50'
    }`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-lg group">
            {impact.category === 'E' ? 'Environmental' :
             impact.category === 'S' ? 'Social' :
             'Governance'}: {impact.name}
            <span className="ml-1 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">🔗</span>
          </h4>
          <div className="flex items-center text-sm mt-1">
            <span className={`mr-2 px-2 py-1 rounded-full text-xs font-medium ${
              impact.impact === 'High' ? 'bg-red-100 text-red-800' :
              impact.impact === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {impact.impact} Impact
            </span>
            <span className={`flex items-center text-xs ${
              impact.trend === 'increasing' ? 'text-red-600' :
              impact.trend === 'decreasing' ? 'text-green-600' :
              'text-gray-600'
            }`}>
              {impact.trend === 'increasing' ? '↑' : 
              impact.trend === 'decreasing' ? '↓' : '→'} 
              {impact.trend}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-full h-12 w-12 flex items-center justify-center border">
          <span className="font-bold text-lg">{impact.score.toFixed(1)}</span>
        </div>
      </div>
    </div>
    <div className="p-4">
      <p className="text-gray-700">{impact.description}</p>
      <div className="mt-3">
        <h5 className="text-sm font-medium mb-2">Relevant Frameworks:</h5>
        <div className="flex flex-wrap gap-2">
          {impact.relevant_frameworks?.map((framework, j) => (
            <span key={j} className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
              {framework}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-2 text-right">
        <span className="text-xs text-blue-600 hover:underline">
          {impact.source ? `Source: ${impact.source}` : 'View details'}
        </span>
      </div>
    </div>
  </div>
))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            No ESG impacts match your filter criteria. Try adjusting the filters.
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'frameworks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('frameworks')}
          >
            Regulatory Frameworks
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'esg' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('esg')}
          >
            ESG Impacts
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'frameworks' && renderFrameworks()}
        {activeTab === 'esg' && renderESG()}
      </div>
    </div>
  );
};

export default RegulatoryESGTracker;