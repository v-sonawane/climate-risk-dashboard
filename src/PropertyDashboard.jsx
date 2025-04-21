import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, Droplet, Wind, Flame, Cloud, Thermometer, BarChart3, MapPin, DollarSign, Calendar, TrendingUp, Map, Building, Shield, Brain, Calculator, BarChart2 } from 'lucide-react';
import TrackedPropertyList from './TrackedPropertyList';
import RegisterPropertyForm from './RegisterPropertyForm';
import UploadPropertyCSV from './UploadPropertyCSV';
import { AIPropertyService } from './AIPropertyService'; // Fixed import statement

const API_BASE_URL = 'http://localhost:8000';

export default function PropertyDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [premiumTrends, setPremiumTrends] = useState([]);
  const [activeHazards, setActiveHazards] = useState([]);
  const [stats, setStats] = useState({
    totalProperties: 0,
    averagePremiumMultiplier: 1.0,
    propertiesAtRisk: 0,
    highRiskHazards: {},
  });
  const [refresh, setRefresh] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [propertyValuations, setPropertyValuations] = useState({});
  const [portfolioRecommendations, setPortfolioRecommendations] = useState([]);
  const [premiumRecommendations, setPremiumRecommendations] = useState({});
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const RISK_COLORS = {
    High: '#ef4444',
    Medium: '#f59e0b',
    Low: '#10b981'
  };
  const loadData = async () => {
    setLoading(true);
    setError(null);
    console.log('Starting to load data...');
    try {
      // Fetch properties
      console.log('Fetching properties...');
      const propertiesRes = await fetch(`${API_BASE_URL}/properties`);
      if (!propertiesRes.ok) {
        throw new Error(`API returned status: ${propertiesRes.status}`);
      }
      const propertiesData = await propertiesRes.json();
      console.log('Properties data received:', propertiesData);
      setProperties(propertiesData);
      
      // Fetch premium trends
      console.log('Fetching premium trends...');
      const premiumRes = await fetch(`${API_BASE_URL}/underwriting/premium-trends?months=12`);
      if (premiumRes.ok) {
        const premiumData = await premiumRes.json();
        console.log('Premium trends data received:', premiumData);
        setPremiumTrends(premiumData);
      } else {
        console.warn('Failed to fetch premium trends:', premiumRes.status);
      }
      
      // Fetch active hazards
      console.log('Fetching active hazards...');
      const hazardsRes = await fetch(`${API_BASE_URL}/hazards/active`);
      if (hazardsRes.ok) {
        const hazardsData = await hazardsRes.json();
        console.log('Active hazards data received:', hazardsData);
        setActiveHazards(hazardsData);
      } else {
        console.warn('Failed to fetch active hazards:', hazardsRes.status);
      }
  
      // Calculate statistics from properties
      console.log('Calculating stats...');
      await calculateStats(propertiesData);
      console.log('Stats calculated successfully');
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err.message);
    } finally {
      console.log('Data loading completed');
      setLoading(false);
    }
  };

  const calculateStats = async (propertiesData) => {
    const totalProps = propertiesData.length;
    
    // For each property, fetch its risk data
    let totalPremiumMultiplier = 0;
    let highRiskProps = 0;
    const riskCounts = { flood: 0, wildfire: 0, wind: 0, drought: 0, storm: 0 };
    
    // This would normally fetch real risk data for each property
    // For demonstration, we'll use a simpler approach
    for (const property of propertiesData) {
      if (property.latitude && property.longitude) {
        try {
          const riskRes = await fetch(
            `${API_BASE_URL}/climate-risks/multi-hazard?lat=${property.latitude}&lon=${property.longitude}`
          );
          
          if (riskRes.ok) {
            const riskData = await riskRes.json();
            
            // Add premium multiplier to total
            totalPremiumMultiplier += riskData.premium_multiplier;
            
            // Check if property is at high risk for any hazard
            if (riskData.flood.level === 'High' || 
                riskData.wildfire.level === 'High' || 
                riskData.wind.level === 'High' || 
                riskData.drought.level === 'High' || 
                riskData.storm.level === 'High') {
              highRiskProps++;
            }
            
            // Increment hazard counters
            if (riskData.flood.level === 'High') riskCounts.flood++;
            if (riskData.wildfire.level === 'High') riskCounts.wildfire++;
            if (riskData.wind.level === 'High') riskCounts.wind++;
            if (riskData.drought.level === 'High') riskCounts.drought++;
            if (riskData.storm.level === 'High') riskCounts.storm++;
          }
        } catch (err) {
          console.error(`Error fetching risk data for ${property.name}:`, err);
        }
      }
    }
    
    setStats({
      totalProperties: totalProps,
      averagePremiumMultiplier: totalProps > 0 ? (totalPremiumMultiplier / totalProps).toFixed(2) : 1.0,
      propertiesAtRisk: highRiskProps,
      highRiskHazards: riskCounts
    });
  };

  // Generate hazard risk distribution data for pie chart
  const getHazardDistributionData = () => {
    const { highRiskHazards } = stats;
    return [
      { name: 'Flood', value: highRiskHazards.flood || 0 },
      { name: 'Wildfire', value: highRiskHazards.wildfire || 0 },
      { name: 'Wind', value: highRiskHazards.wind || 0 },
      { name: 'Drought', value: highRiskHazards.drought || 0 },
      { name: 'Storm', value: highRiskHazards.storm || 0 }
    ].filter(item => item.value > 0);
  };

  // Generate region distribution data for pie chart
  const getRegionDistributionData = () => {
    const regions = {};
    properties.forEach(property => {
      // Extract region from address (simplified approach)
      const addressParts = property.address.split(',');
      const region = addressParts.length > 1 ? addressParts[addressParts.length - 1].trim() : 'Unknown';
      regions[region] = (regions[region] || 0) + 1;
    });
    
    return Object.entries(regions).map(([name, value]) => ({ name, value }));
  };

  // Handle AI Property Valuation
  const handleGeneratePropertyValuation = async () => {
    if (!selectedProperty) return;
    
    setAiAnalysisLoading(true);
    try {
      const property = properties.find(p => p.id === selectedProperty);
      if (!property) throw new Error('Selected property not found');
      
      const result = await AIPropertyService.generatePropertyValuation(property);
      
      setPropertyValuations(prev => ({
        ...prev,
        [selectedProperty]: result
      }));
    } catch (error) {
      console.error('Error generating property valuation:', error);
      setError('Failed to generate property valuation. Please try again.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Handle AI Portfolio Recommendations
  const handleGeneratePortfolioRecommendations = async () => {
    setAiAnalysisLoading(true);
    try {
      const result = await AIPropertyService.generatePortfolioRecommendations(properties);
      setPortfolioRecommendations(result);
    } catch (error) {
      console.error('Error generating portfolio recommendations:', error);
      setError('Failed to generate portfolio recommendations. Please try again.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Handle AI Premium Recommendation
  const handleGeneratePremiumRecommendation = async () => {
    if (!selectedProperty) return;
    
    setAiAnalysisLoading(true);
    try {
      const property = properties.find(p => p.id === selectedProperty);
      if (!property) throw new Error('Selected property not found');
      
      const result = await AIPropertyService.generatePremiumRecommendation(property);
      
      setPremiumRecommendations(prev => ({
        ...prev,
        [selectedProperty]: result
      }));
    } catch (error) {
      console.error('Error generating premium recommendation:', error);
      setError('Failed to generate premium recommendation. Please try again.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refresh]);

  const handleRefresh = () => {
    setRefresh(prev => !prev);
  };

  const renderRiskIcon = (riskType) => {
    switch (riskType.toLowerCase()) {
      case 'flood': return <Droplet className="h-4 w-4 text-blue-500" />;
      case 'wildfire': return <Flame className="h-4 w-4 text-orange-500" />;
      case 'wind': return <Wind className="h-4 w-4 text-purple-500" />;
      case 'drought': return <Thermometer className="h-4 w-4 text-amber-500" />;
      case 'storm': return <Cloud className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderActiveHazardsList = () => {
    if (activeHazards.length === 0) {
      return <p className="text-gray-500 text-center py-4">No active hazards detected</p>;
    }

    return (
      <div className="overflow-y-auto max-h-72">
        {activeHazards.slice(0, 10).map((hazard, idx) => (
          <div key={idx} className="p-2 border-b flex items-center">
            <AlertTriangle className="text-amber-500 mr-2" />
            <div>
              <p className="font-medium text-sm">{hazard.title}</p>
              <p className="text-xs text-gray-500">Severity: {hazard.severity}</p>
            </div>
          </div>
        ))}
        {activeHazards.length > 10 && (
          <p className="text-xs text-center text-gray-500 mt-2">
            +{activeHazards.length - 10} more hazards
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Property Portfolio</h1>
          <p className="text-gray-600">Manage and monitor your property portfolio's climate risk exposure</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center"
          >
            <span className="mr-1">↻</span> Refresh Data
          </button>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg inline-flex">
        <button 
          className={`px-3 py-1 rounded ${activeView === 'dashboard' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('dashboard')}
        >
          <BarChart3 className="h-4 w-4 inline mr-1" /> Dashboard
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeView === 'properties' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('properties')}
        >
          <Building className="h-4 w-4 inline mr-1" /> Properties
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeView === 'add' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('add')}
        >
          <MapPin className="h-4 w-4 inline mr-1" /> Add Property
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeView === 'valuation' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('valuation')}
        >
          <Calculator className="h-4 w-4 inline mr-1" /> AI Valuation
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeView === 'portfolio' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('portfolio')}
        >
          <BarChart2 className="h-4 w-4 inline mr-1" /> Portfolio AI
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeView === 'premium' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          onClick={() => setActiveView('premium')}
        >
          <DollarSign className="h-4 w-4 inline mr-1" /> Premium AI
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
          <div>
            <h4 className="font-medium">Error Loading Data</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {activeView === 'dashboard' && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Total Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProperties}</p>
                </div>
                <Building className="h-10 w-10 text-blue-500 bg-blue-100 p-2 rounded-full" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Properties at Risk</p>
                  <p className="text-2xl font-bold">{stats.propertiesAtRisk}</p>
                  <p className="text-xs text-gray-500">
                    {stats.totalProperties > 0 
                      ? `${Math.round((stats.propertiesAtRisk / stats.totalProperties) * 100)}% of portfolio` 
                      : '0% of portfolio'}
                  </p>
                </div>
                <AlertTriangle className="h-10 w-10 text-amber-500 bg-amber-100 p-2 rounded-full" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Avg Premium Multiplier</p>
                  <p className="text-2xl font-bold">×{stats.averagePremiumMultiplier}</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500 bg-green-100 p-2 rounded-full" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-sm">Active Hazards</p>
                  <p className="text-2xl font-bold">{activeHazards.length}</p>
                </div>
                <Shield className="h-10 w-10 text-red-500 bg-red-100 p-2 rounded-full" />
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Premium Trends */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-2 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Premium Trends (12 Months)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={premiumTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="property" stroke="#8884d8" name="Property" />
                  <Line type="monotone" dataKey="casualty" stroke="#82ca9d" name="Casualty" />
                  <Line type="monotone" dataKey="combined" stroke="#ff7300" name="Combined" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-2 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                High Risk Hazard Distribution
              </h3>
              {getHazardDistributionData().length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getHazardDistributionData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getHazardDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No high risk hazards detected in portfolio
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Region Distribution */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-medium mb-2 flex items-center">
                <Map className="h-5 w-5 mr-2 text-blue-500" />
                Properties by Region
              </h3>
              {properties.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getRegionDistributionData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {getRegionDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No properties in portfolio
                </div>
              )}
            </div>

            {/* Properties at Risk */}
            <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
              <h3 className="font-medium mb-2 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                Active Hazard Alerts
              </h3>
              {renderActiveHazardsList()}
            </div>
          </div>
        </>
      )}

      {activeView === 'properties' && (
        <TrackedPropertyList key={refresh} />
      )}

      {activeView === 'add' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RegisterPropertyForm onSuccess={handleRefresh} />
          <UploadPropertyCSV onUploadComplete={handleRefresh} />
        </div>
      )}

      {/* AI Property Valuation View */}
      {activeView === 'valuation' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <Calculator className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-bold">AI Property Valuation</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Get AI-powered property valuation estimates that account for climate risk factors.
              Select a property to analyze its value adjustment based on risk profile.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Property for Analysis</label>
              <select 
                className="w-full p-2 border rounded" 
                value={selectedProperty || ''}
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                <option value="">-- Select a property --</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
            </div>

            {selectedProperty && (
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
                onClick={handleGeneratePropertyValuation}
                disabled={aiAnalysisLoading}
              >
                {aiAnalysisLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing Property...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Generate AI Valuation
                  </>
                )}
              </button>
            )}
          </div>

          {/* Display valuation results if available */}
          {selectedProperty && propertyValuations[selectedProperty] && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-bold mb-4">Valuation Analysis for {properties.find(p => p.id === selectedProperty)?.name}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border p-4 rounded bg-gray-50">
                  <h4 className="font-medium mb-2">Baseline Valuation</h4>
                  <p className="text-2xl font-bold text-gray-700">${propertyValuations[selectedProperty].baselineValue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600 mt-1">Standard market valuation without climate risk adjustment</p>
                </div>
                
                <div className="border p-4 rounded bg-gray-50">
                  <h4 className="font-medium mb-2">Risk-Adjusted Valuation</h4>
                  <p className={`text-2xl font-bold ${propertyValuations[selectedProperty].adjustedValue < propertyValuations[selectedProperty].baselineValue ? 'text-red-600' : 'text-green-600'}`}>
                    ${propertyValuations[selectedProperty].adjustedValue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {propertyValuations[selectedProperty].adjustedValue < propertyValuations[selectedProperty].baselineValue ? 'Decrease' : 'Increase'} of {Math.abs(((propertyValuations[selectedProperty].adjustedValue / propertyValuations[selectedProperty].baselineValue) - 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">Valuation Factors</h4>
                <ul className="space-y-2">
                  {propertyValuations[selectedProperty].factors.map((factor, index) => (
                    <li key={index} className="flex items-start">
                      <span className={`inline-block w-5 text-center ${factor.impact < 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {factor.impact < 0 ? '↓' : '↑'}
                      </span>
                      <span className="ml-2">{factor.description} <span className="text-gray-500">({factor.impact > 0 ? '+' : ''}{factor.impact}%)</span></span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
                <h4 className="font-medium mb-2">AI Analysis</h4>
                <p className="text-gray-700">{propertyValuations[selectedProperty].analysis}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Portfolio Optimization View */}
      {activeView === 'portfolio' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-4">
              <BarChart2 className="h-6 w-6 text-blue-500 mr-2" />
              <h2 className="text-xl font-bold">AI Portfolio Optimization</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Get AI-powered recommendations to optimize your property portfolio and balance climate risk exposure.
            </p>
            
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
              onClick={handleGeneratePortfolioRecommendations}
              disabled={aiAnalysisLoading}
            >
              {aiAnalysisLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Portfolio...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Portfolio Recommendations
                </>
              )}
            </button>
          </div>

          {/* Display portfolio recommendations if available */}
          {portfolioRecommendations.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-4">Portfolio Analysis & Recommendations</h3>
            
            <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
              <h4 className="font-medium mb-2">Risk Exposure Summary</h4>
              <p className="text-gray-700">{portfolioRecommendations[0].summary}</p>
            </div>
            
            <h4 className="font-medium mb-3">Recommendations</h4>
            <div className="space-y-4">
              {portfolioRecommendations.map((rec, index) => (
                <div key={index} className="border rounded p-4">
                  <h5 className="font-medium">{rec.title}</h5>
                  <p className="text-gray-600 mt-1">{rec.description}</p>
                  {rec.potentialImpact && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-500">Potential Impact: </span>
                      <span className={`text-sm ${rec.potentialImpact.includes('High') ? 'text-red-600' : rec.potentialImpact.includes('Medium') ? 'text-amber-600' : 'text-green-600'}`}>
                        {rec.potentialImpact}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

  {/* AI Premium Recommendation View */}
  {activeView === 'premium' && (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <DollarSign className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold">AI Premium Recommendation</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Get AI-powered premium adjustment recommendations based on property climate risk assessments.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Property for Analysis</label>
          <select 
            className="w-full p-2 border rounded" 
            value={selectedProperty || ''}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="">-- Select a property --</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name} - {property.address}
              </option>
            ))}
          </select>
        </div>

        {selectedProperty && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center"
            onClick={handleGeneratePremiumRecommendation}
            disabled={aiAnalysisLoading}
          >
            {aiAnalysisLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing Premium...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate Premium Recommendation
              </>
            )}
          </button>
        )}
      </div>

      {/* Display premium recommendations if available */}
      {selectedProperty && premiumRecommendations[selectedProperty] && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4">Premium Analysis for {properties.find(p => p.id === selectedProperty)?.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Current Premium</h4>
              <p className="text-2xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].currentPremium.toLocaleString()}/yr</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Recommended Premium</h4>
              <p className={`text-2xl font-bold ${premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].currentPremium ? 'text-red-600' : 'text-green-600'}`}>
                ${premiumRecommendations[selectedProperty].recommendedPremium.toLocaleString()}/yr
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].currentPremium ? 'Increase' : 'Decrease'} of {Math.abs(((premiumRecommendations[selectedProperty].recommendedPremium / premiumRecommendations[selectedProperty].currentPremium) - 1) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          
          <div className="mt-6">
            <h4 className="font-medium mb-2">Risk Adjustment Factors</h4>
            <ul className="space-y-2">
              {premiumRecommendations[selectedProperty].factors.map((factor, index) => (
                <li key={index} className="flex items-start">
                  <span className={`inline-block w-5 text-center ${factor.impact > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {factor.impact > 0 ? '↑' : '↓'}
                  </span>
                  <span className="ml-2">{factor.description} <span className="text-gray-500">({factor.impact > 0 ? '+' : ''}{factor.impact}%)</span></span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h4 className="font-medium mb-2">AI Analysis</h4>
            <p className="text-gray-700">{premiumRecommendations[selectedProperty].analysis}</p>
          </div>
        </div>
      )}
    </div>
  )}
</div>
);
}
