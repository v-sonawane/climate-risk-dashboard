import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Area, Scatter, ScatterChart, ZAxis
} from 'recharts';
import { AlertOctagon, TrendingUp, Droplet, Wind, Umbrella, Thermometer, MapPin, Download, Filter, Info } from 'lucide-react';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';

const UnderwritingCoverageAnalysis = () => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [underwritingData, setUnderwritingData] = useState([]);
  const [coverageGapData, setCoverageGapData] = useState([]);
  const [premiumTrends, setPremiumTrends] = useState([]);
  const [hazardData, setHazardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHazardType, setSelectedHazardType] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
  const HAZARD_COLORS = {
    'flood': '#0088FE',
    'hurricane': '#8884d8',
    'wildfire': '#FF8042',
    'drought': '#FFBB28',
    'storm': '#00C49F',
    'other': '#82ca9d'
  };
  
  // Fetch data
  useEffect(() => {
    fetchData();
  }, [selectedHazardType, selectedRegion]);
  
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch underwriting challenges data from actual endpoint
      const underwritingParams = new URLSearchParams();
      if (selectedHazardType !== 'all') underwritingParams.append('hazard_type', selectedHazardType);
      if (selectedRegion !== 'all') underwritingParams.append('region', selectedRegion);
      
      const underwritingResponse = await fetch(
        `${API_BASE_URL}/underwriting/challenges?${underwritingParams.toString()}`
      );
      
      if (!underwritingResponse.ok) {
        throw new Error(`Failed to fetch underwriting data: ${underwritingResponse.status}`);
      }
      
      const underwritingResponseData = await underwritingResponse.json();
      
      // If we have data, use it
      if (underwritingResponseData && underwritingResponseData.length > 0) {
        setUnderwritingData(underwritingResponseData);
        console.log(`Loaded ${underwritingResponseData.length} underwriting challenges from API`);
      } else {
        // If no data, use AI to analyze structured summaries and generate challenges
        await generateUnderwritingChallenges();
      }
      
      // Fetch coverage gap data
      const coverageParams = new URLSearchParams();
      if (selectedHazardType !== 'all') coverageParams.append('hazard_type', selectedHazardType);
      if (selectedRegion !== 'all') coverageParams.append('region', selectedRegion);
      
      const coverageResponse = await fetch(
        `${API_BASE_URL}/underwriting/coverage-gaps?${coverageParams.toString()}`
      );
      
      if (!coverageResponse.ok) {
        throw new Error(`Failed to fetch coverage gap data: ${coverageResponse.status}`);
      }
      
      const coverageResponseData = await coverageResponse.json();
      setCoverageGapData(coverageResponseData);
      
      // Fetch premium trend data
      const premiumResponse = await fetch(`${API_BASE_URL}/underwriting/premium-trends`);
      if (!premiumResponse.ok) {
        throw new Error(`Failed to fetch premium trend data: ${premiumResponse.status}`);
      }
      
      const premiumResponseData = await premiumResponse.json();
      setPremiumTrends(premiumResponseData);
      
      // Fetch hazard data
      try {
        const hazardResponse = await fetch(`${API_BASE_URL}/hazards/active`);
        if (hazardResponse.ok) {
          const hazardResponseData = await hazardResponse.json();
          setHazardData(processHazardData(hazardResponseData));
        } else {
          // Fallback if hazards endpoint fails
          console.warn("Hazards endpoint failed, using fallback data");
          setHazardData(generateFallbackHazardData());
        }
      } catch (hazardError) {
        console.error("Error fetching hazard data:", hazardError);
        setHazardData(generateFallbackHazardData());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      
      // Use fallback data on error
      setUnderwritingData(generateFallbackUnderwritingData());
      setCoverageGapData(generateFallbackCoverageGapData());
      setPremiumTrends(generateFallbackPremiumTrends());
      setHazardData(generateFallbackHazardData());
    } finally {
      setIsLoading(false);
    }
  };


  
  // Add this function to generate underwriting challenges from structured summaries
  // using AI-powered analysis if the API endpoint doesn't have data
const generateUnderwritingChallenges = async () => {
  console.log("Generating underwriting challenges from structured summaries");
  
  try {
    // 1. Fetch structured summaries from the API
    const summariesResponse = await fetch(`${API_BASE_URL}/structured-summaries?limit=50`);
    if (!summariesResponse.ok) {
      throw new Error("Failed to fetch structured summaries");
    }
    
    const summaries = await summariesResponse.json();
    
    if (!summaries || summaries.length === 0) {
      throw new Error("No structured summaries available");
    }
    
    console.log(`Found ${summaries.length} structured summaries to analyze`);
    
    // 2. Use repl to analyze the summaries and extract underwriting challenges
    const result = await repl(`
      // This code analyzes structured summaries to extract underwriting challenges
      
      // The structured summaries data
      const summaries = ${JSON.stringify(summaries)};
      
      // Keywords relevant to underwriting challenges
      const underwritingKeywords = [
        "underwriting", "premium", "pricing", "rate", "coverage", "capacity", 
        "risk assessment", "model", "catastrophe", "flood", "wildfire", "hurricane"
      ];
      
      // Find summaries related to underwriting challenges
      const underwritingRelatedSummaries = summaries.filter(summary => {
        const keyEvent = summary.key_event?.toLowerCase() || '';
        const businessImplications = summary.business_implications?.toLowerCase() || '';
        return underwritingKeywords.some(keyword => 
          keyEvent.includes(keyword) || businessImplications.includes(keyword)
        );
      });
      
      console.log("Found " + underwritingRelatedSummaries.length + " underwriting-related summaries");
      
      // Extract challenges from each relevant summary
      const challenges = underwritingRelatedSummaries.map((summary, index) => {
        // Determine hazard type from content
        const content = (summary.key_event + ' ' + summary.business_implications).toLowerCase();
        let hazardType = 'other';
        
        if (content.includes('flood')) hazardType = 'flood';
        else if (content.includes('hurricane') || content.includes('cyclone')) hazardType = 'hurricane';
        else if (content.includes('wildfire') || content.includes('fire')) hazardType = 'wildfire';
        else if (content.includes('drought')) hazardType = 'drought';
        else if (content.includes('storm') || content.includes('hail') || content.includes('tornado')) hazardType = 'storm';
        
        // Determine region
        let region = 'global';
        const geoFocus = summary.geographic_focus?.toLowerCase() || '';
        
        if (geoFocus.includes('north america') || geoFocus.includes('united states') || geoFocus.includes('canada')) {
          region = 'north_america';
        } else if (geoFocus.includes('europe')) {
          region = 'europe';
        } else if (geoFocus.includes('asia') || geoFocus.includes('australia') || geoFocus.includes('pacific')) {
          region = 'asia_pacific';
        } else if (geoFocus.includes('latin') || geoFocus.includes('south america')) {
          region = 'latin_america';
        } else if (geoFocus.includes('africa') || geoFocus.includes('middle east')) {
          region = 'africa_middle_east';
        }
        
        // Determine impact level
        const implications = summary.business_implications?.toLowerCase() || '';
        let impactLevel = 'Medium';
        
        if (implications.includes('significant') || implications.includes('severe') || 
            implications.includes('high') || implications.includes('major')) {
          impactLevel = 'High';
        } else if (implications.includes('minor') || implications.includes('limited') || 
                  implications.includes('low') || implications.includes('minimal')) {
          impactLevel = 'Low';
        }
        
        // Create challenge record
        return {
          id: 'summary_' + summary.id + '_' + index,
          challenge: summary.key_event || 'Unnamed Challenge',
          hazard_type: hazardType,
          region: region,
          impact_level: impactLevel,
          business_implications: summary.business_implications || 'No details provided',
          source: summary.source || 'Unknown',
          date: summary.date || new Date().toISOString().split('T')[0]
        };
      });
      
      // Return the generated challenges
      return challenges;
    `);
    
    if (result && result.length > 0) {
      console.log(`Generated ${result.length} underwriting challenges from summaries`);
      setUnderwritingData(result);
      
      // Optional: You could also POST these to your backend to persist them
      try {
        await fetch(`${API_BASE_URL}/admin/store-underwriting-challenges`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(result),
        });
      } catch (storeError) {
        console.error("Error storing generated challenges:", storeError);
      }
    } else {
      // If generation failed, fall back to default data
      setUnderwritingData(generateFallbackUnderwritingData());
    }
    
  } catch (error) {
    console.error("Error generating underwriting challenges:", error);
    setUnderwritingData(generateFallbackUnderwritingData());
  }
};

  
  
  // Transform structured summaries to underwriting challenges
  const transformSummariesToUnderwritingData = (summaries) => {
    // Extract keywords related to underwriting challenges
    const underwritingKeywords = [
      'flood', 'hurricane', 'wildfire', 'storm', 'climate', 'model', 
      'pricing', 'premium', 'exclusion', 'coverage', 'limit', 'capacity'
    ];
    
    return summaries
      .filter(summary => {
        const key_event = summary.key_event?.toLowerCase() || '';
        const business_imp = summary.business_implications?.toLowerCase() || '';
        return underwritingKeywords.some(keyword => 
          key_event.includes(keyword) || business_imp.includes(keyword)
        );
      })
      .map(summary => ({
        id: summary.id,
        challenge: summary.key_event,
        hazard_type: determineHazardType(summary),
        region: determineRegion(summary.geographic_focus),
        impact_level: determineImpactLevel(summary.business_implications),
        business_implications: summary.business_implications,
        source: summary.source,
        date: summary.date
      }));
  };
  
  // Helper function to determine hazard type from summary
      const determineHazardType = (summary) => {
    const content = (summary.key_event + ' ' + summary.business_implications).toLowerCase();
    if (content.includes('flood')) return 'flood';
    if (content.includes('hurricane') || content.includes('cyclone')) return 'hurricane';
    if (content.includes('wildfire') || content.includes('fire')) return 'wildfire';
    if (content.includes('drought')) return 'drought';
    if (content.includes('storm') || content.includes('hail') || content.includes('tornado')) return 'storm';
    return 'other';
  };
  
  // Helper function to determine region from geographic focus
  const determineRegion = (geographic_focus) => {
    if (!geographic_focus) return 'global';
    
    const focus = geographic_focus.toLowerCase();
    if (focus.includes('north america') || focus.includes('united states') || focus.includes('canada')) {
      return 'north_america';
    }
    if (focus.includes('europe')) return 'europe';
    if (focus.includes('asia') || focus.includes('australia') || focus.includes('pacific')) {
      return 'asia_pacific';
    }
    if (focus.includes('latin') || focus.includes('south america')) return 'latin_america';
    if (focus.includes('africa') || focus.includes('middle east')) return 'africa_middle_east';
    
    return 'global';
  };
  
  // Helper function to determine impact level
  const determineImpactLevel = (business_implications) => {
    if (!business_implications) return 'Medium';
    
    const implications = business_implications.toLowerCase();
    if (implications.includes('significant') || implications.includes('severe') || 
        implications.includes('high') || implications.includes('major') || 
        implications.includes('substantial')) {
      return 'High';
    }
    if (implications.includes('minor') || implications.includes('limited') || 
        implications.includes('low') || implications.includes('minimal')) {
      return 'Low';
    }
    
    return 'Medium';
  };
  
  // Process hazard data from API
  const processHazardData = (hazardData) => {
    return hazardData.map(hazard => ({
      ...hazard,
      hazard_type: categorizeHazardType(hazard.title)
    }));
  };
  
  // Categorize hazard type from title
  const categorizeHazardType = (title) => {
    if (!title) return 'other';
    
    const titleLower = title.toLowerCase();
    if (titleLower.includes('flood')) return 'flood';
    if (titleLower.includes('hurricane') || titleLower.includes('cyclone')) return 'hurricane';
    if (titleLower.includes('wildfire') || titleLower.includes('fire')) return 'wildfire';
    if (titleLower.includes('drought')) return 'drought';
    if (titleLower.includes('storm') || titleLower.includes('hail') || 
        titleLower.includes('tornado') || titleLower.includes('wind')) {
      return 'storm';
    }
    
    return 'other';
  };
  
  // Generate fallback data for testing
  const generateFallbackUnderwritingData = () => [
    {
      id: '1',
      challenge: 'Flood risk models underestimating exposure in coastal regions',
      hazard_type: 'flood',
      region: 'north_america',
      impact_level: 'High',
      business_implications: 'Significant premium increases needed in high-risk zones; potential for coverage restrictions',
      source: 'Climate Home News',
      date: '2024-03-22'
    },
    {
      id: '2',
      challenge: 'Wildfire risk expanding beyond traditional high-risk zones',
      hazard_type: 'wildfire',
      region: 'north_america',
      impact_level: 'High',
      business_implications: 'Need for revised wildfire risk scoring and potential coverage limitations',
      source: 'Insurance Journal',
      date: '2024-04-05'
    },
    {
      id: '3',
      challenge: 'Hurricane intensity increasing beyond historical patterns',
      hazard_type: 'hurricane',
      region: 'north_america',
      impact_level: 'High',
      business_implications: 'Catastrophe models need recalibration; higher reinsurance costs',
      source: 'Insurance Business Magazine',
      date: '2024-03-15'
    },
    {
      id: '4',
      challenge: 'Sea level rise invalidating flood zone maps',
      hazard_type: 'flood',
      region: 'global',
      impact_level: 'Medium',
      business_implications: 'Underwriting decisions based on outdated FEMA flood maps creating unexpected exposure',
      source: 'Climate Home News',
      date: '2024-02-18'
    },
    {
      id: '5',
      challenge: 'Reinsurance capacity constraints for hurricane coverage',
      hazard_type: 'hurricane',
      region: 'global',
      impact_level: 'High',
      business_implications: 'Primary insurers facing difficulty securing adequate capacity at affordable rates',
      source: 'Insurance Business Magazine',
      date: '2024-03-25'
    }
  ];
  
  const generateFallbackCoverageGapData = () => [
    {
      hazard_type: 'flood',
      region: 'north_america',
      coverage_gap_percentage: 73,
      economic_losses: 42,
      insured_losses: 11.3,
      trends: {
        gap_change: 5,
        take_up_rate: -3
      },
      key_challenges: [
        'NFIP limitations',
        'Private market appetite constraints',
        'Affordability issues in high-risk zones'
      ]
    },
    {
      hazard_type: 'wildfire',
      region: 'north_america',
      coverage_gap_percentage: 42,
      economic_losses: 28,
      insured_losses: 16.2,
      trends: {
        gap_change: 12,
        take_up_rate: -8
      },
      key_challenges: [
        'Coverage limitations in wildland-urban interface',
        'Increasing non-renewals',
        'State intervention with FAIR plans'
      ]
    },
    {
      hazard_type: 'hurricane',
      region: 'north_america',
      coverage_gap_percentage: 37,
      economic_losses: 65,
      insured_losses: 40.9,
      trends: {
        gap_change: 8,
        take_up_rate: -6
      },
      key_challenges: [
        'High deductibles limiting coverage',
        'Separate wind policies creating gaps',
        'Capacity constraints in high-risk coastal areas'
      ]
    },
    {
      hazard_type: 'drought',
      region: 'global',
      coverage_gap_percentage: 92,
      economic_losses: 38,
      insured_losses: 3.0,
      trends: {
        gap_change: 2,
        take_up_rate: 1
      },
      key_challenges: [
        'Limited parametric products',
        'Difficulty in modeling impacts',
        'Multi-year impact not aligning with annual policies'
      ]
    },
    {
      hazard_type: 'storm',
      region: 'north_america',
      coverage_gap_percentage: 45,
      economic_losses: 34,
      insured_losses: 18.7,
      trends: {
        gap_change: 7,
        take_up_rate: -4
      },
      key_challenges: [
        'Increasing hail deductibles',
        'Anti-concurrent causation clauses',
        'Roof coverage limitations by age'
      ]
    }
  ];
  
  const generateFallbackPremiumTrends = () => [
    {
      month: '2023-05',
      property: 100,
      casualty: 100,
      combined: 100
    },
    {
      month: '2023-06',
      property: 103,
      casualty: 101,
      combined: 102
    },
    {
      month: '2023-07',
      property: 105,
      casualty: 102,
      combined: 104
    },
    {
      month: '2023-08',
      property: 108,
      casualty: 104,
      combined: 106
    },
    {
      month: '2023-09',
      property: 112,
      casualty: 105,
      combined: 109
    },
    {
      month: '2023-10',
      property: 115,
      casualty: 107,
      combined: 112
    },
    {
      month: '2023-11',
      property: 119,
      casualty: 108,
      combined: 114
    },
    {
      month: '2023-12',
      property: 123,
      casualty: 110,
      combined: 118
    },
    {
      month: '2024-01',
      property: 128,
      casualty: 112,
      combined: 121
    },
    {
      month: '2024-02',
      property: 135,
      casualty: 115,
      combined: 126
    },
    {
      month: '2024-03',
      property: 142,
      casualty: 118,
      combined: 132
    },
    {
      month: '2024-04',
      property: 148,
      casualty: 122,
      combined: 137
    }
  ];
  
  const generateFallbackHazardData = () => [
    {
      id: 'flood-1',
      title: 'Flood Warning - Mississippi River Basin',
      hazard_type: 'flood',
      severity: 'Severe',
      region: 'north_america',
      lat: 38.6270,
      lng: -90.1994,
      areas_affected: ['Missouri', 'Illinois', 'Iowa']
    },
    {
      id: 'wildfire-1',
      title: 'Wildfire Alert - Southern California',
      hazard_type: 'wildfire',
      severity: 'Severe',
      region: 'north_america',
      lat: 34.0522,
      lng: -118.2437,
      areas_affected: ['Los Angeles County', 'Ventura County']
    },
    {
      id: 'hurricane-1',
      title: 'Hurricane Warning - Gulf Coast',
      hazard_type: 'hurricane',
      severity: 'Extreme',
      region: 'north_america',
      lat: 29.7604,
      lng: -95.3698,
      areas_affected: ['Texas', 'Louisiana']
    },
    {
      id: 'storm-1',
      title: 'Severe Thunderstorm Watch - Midwest',
      hazard_type: 'storm',
      severity: 'Moderate',
      region: 'north_america',
      lat: 41.8781,
      lng: -87.6298,
      areas_affected: ['Illinois', 'Indiana', 'Michigan']
    }
  ];
  
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
            <AlertOctagon className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-lg font-medium">Premium Trend</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            +{premiumTrends.length > 1 ? 
              ((premiumTrends[premiumTrends.length-1].property / 
                premiumTrends[0].property - 1) * 100).toFixed(0) : 
              '48'}%
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Property insurance premium increase in the past 12 months
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-3">
            <Umbrella className="h-5 w-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium">Coverage Gap</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">
            {coverageGapData.length > 0 ? 
              `${Math.round(coverageGapData.reduce((sum, item) => sum + item.coverage_gap_percentage, 0) / 
              coverageGapData.length)}%` : 
              '58%'}
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Average gap between economic and insured losses
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center mb-3">
            <MapPin className="h-5 w-5 text-green-500 mr-2" />
            <h3 className="text-lg font-medium">Active Hazards</h3>
          </div>
          <div className="text-3xl font-bold text-gray-800">{hazardData.length}</div>
          <div className="mt-2 text-sm text-gray-600">
            Current climate hazards affecting underwriting
          </div>
        </div>
      </div>

      {/* Premium Trends Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Premium Trends (Indexed to 100)</h3>
          <button
            onClick={() => downloadCSV(premiumTrends, 'premium_trends.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        <div className="h-72">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : error ? (
            <div className="text-red-500 flex justify-center items-center h-full">
              Error loading premium trends: {error}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={premiumTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[80, 160]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="property" name="Property" stroke="#FF8042" strokeWidth={2} />
                <Line type="monotone" dataKey="casualty" name="Casualty" stroke="#0088FE" strokeWidth={2} />
                <Line type="monotone" dataKey="combined" name="Combined" stroke="#00C49F" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Coverage Gap & Active Hazards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Coverage Gaps by Hazard Type</h3>
            <button
              onClick={() => setActiveTab('coverage')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Details →
            </button>
          </div>
          <div className="h-64">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageGapData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hazard_type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="coverage_gap_percentage" name="Coverage Gap (%)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Active Climate Hazards</h3>
            <button
              onClick={() => setActiveTab('hazards')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Map →
            </button>
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {hazardData.map((hazard, i) => (
                <div key={i} className="p-3 border rounded-md hover:bg-gray-50">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      {hazard.hazard_type === 'flood' && <Droplet className="h-4 w-4 text-blue-500 mr-2" />}
                      {hazard.hazard_type === 'hurricane' && <Wind className="h-4 w-4 text-purple-500 mr-2" />}
                      {hazard.hazard_type === 'wildfire' && <AlertOctagon className="h-4 w-4 text-orange-500 mr-2" />}
                      {hazard.hazard_type === 'drought' && <Thermometer className="h-4 w-4 text-yellow-500 mr-2" />}
                      {hazard.hazard_type === 'storm' && <Umbrella className="h-4 w-4 text-green-500 mr-2" />}
                      {hazard.hazard_type === 'other' && <Info className="h-4 w-4 text-gray-500 mr-2" />}
                      <span className="font-medium">{hazard.title}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      hazard.severity === 'Extreme' ? 'bg-red-100 text-red-800' :
                      hazard.severity === 'Severe' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hazard.severity}
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

  // Render Underwriting Challenges Tab
  const renderUnderwritingChallenges = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Filter className="h-5 w-5 mr-2 text-blue-500" />
          Filter Challenges
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="hazard-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Hazard Type
            </label>
            <select
              id="hazard-filter"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedHazardType}
              onChange={(e) => setSelectedHazardType(e.target.value)}
            >
              <option value="all">All Hazard Types</option>
              <option value="flood">Flood</option>
              <option value="hurricane">Hurricane/Cyclone</option>
              <option value="wildfire">Wildfire</option>
              <option value="drought">Drought</option>
              <option value="storm">Storm/Hail/Tornado</option>
              <option value="other">Other</option>
            </select>
          </div>
          
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
              <option value="all">All Regions</option>
              <option value="north_america">North America</option>
              <option value="europe">Europe</option>
              <option value="asia_pacific">Asia-Pacific</option>
              <option value="latin_america">Latin America</option>
              <option value="africa_middle_east">Africa & Middle East</option>
              <option value="global">Global</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Challenges by Impact Level Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Challenges by Impact Level</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'High', value: underwritingData.filter(c => c.impact_level === 'High').length },
                      { name: 'Medium', value: underwritingData.filter(c => c.impact_level === 'Medium').length },
                      { name: 'Low', value: underwritingData.filter(c => c.impact_level === 'Low').length }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell key="high" fill="#FF4560" />
                    <Cell key="medium" fill="#FEB019" />
                    <Cell key="low" fill="#00E396" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Challenges by Hazard Type</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(HAZARD_COLORS).map(([type, color]) => ({
                    type,
                    count: underwritingData.filter(c => c.hazard_type === type).length,
                    color
                  }))}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="type" type="category" />
                  <Tooltip />
                  <Bar dataKey="count" name="Challenges">
                    {Object.entries(HAZARD_COLORS).map(([type, color], index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      {/* Underwriting Challenges List */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            Underwriting Challenges ({
              selectedHazardType === 'all' && selectedRegion === 'all' ? 
              underwritingData.length : 
              underwritingData.filter(c => 
                (selectedHazardType === 'all' || c.hazard_type === selectedHazardType) &&
                (selectedRegion === 'all' || c.region === selectedRegion)
              ).length
            })
          </h3>
          <button
            onClick={() => downloadCSV(underwritingData, 'underwriting_challenges.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">Error loading underwriting challenges: {error}</div>
        ) : (
          <div className="space-y-4">
            {underwritingData
              .filter(c => 
                (selectedHazardType === 'all' || c.hazard_type === selectedHazardType) &&
                (selectedRegion === 'all' || c.region === selectedRegion)
              )
              .map((challenge, i) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <div className={`p-4 ${
                    challenge.hazard_type === 'flood' ? 'bg-blue-50' :
                    challenge.hazard_type === 'hurricane' ? 'bg-purple-50' :
                    challenge.hazard_type === 'wildfire' ? 'bg-orange-50' :
                    challenge.hazard_type === 'drought' ? 'bg-yellow-50' :
                    challenge.hazard_type === 'storm' ? 'bg-green-50' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-lg">{challenge.challenge}</h4>
                        <div className="flex items-center text-sm mt-1">
                          <span className="capitalize mr-2">
                            {challenge.hazard_type} | 
                            {challenge.region.replace('_', ' ')}
                          </span>
                          <span className={`mr-2 px-2 py-1 rounded-full text-xs font-medium ${
                            challenge.impact_level === 'High' ? 'bg-red-100 text-red-800' :
                            challenge.impact_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {challenge.impact_level} Impact
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {challenge.source} | {challenge.date}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-700">{challenge.business_implications}</p>
                  </div>
                </div>
              ))}
            
            {underwritingData.filter(c => 
              (selectedHazardType === 'all' || c.hazard_type === selectedHazardType) &&
              (selectedRegion === 'all' || c.region === selectedRegion)
            ).length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No underwriting challenges match your filter criteria. Try adjusting the filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render Coverage Gap Analysis Tab
  const renderCoverageGapAnalysis = () => (
    <div className="space-y-6">
      {/* Coverage Gap Summary */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Coverage Gap Analysis</h3>
        <div className="prose max-w-none">
          <p>
            The coverage gap refers to the difference between total economic losses from climate-related events and 
            the portion of those losses that are insured. Analyzing these gaps helps identify market opportunities 
            and potential public-private partnerships to address climate risk protection needs.
          </p>
        </div>
      </div>
      
      {/* Gap Analysis Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Economic vs. Insured Losses</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={coverageGapData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hazard_type" />
                  <YAxis label={{ value: 'Billions USD', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="economic_losses" name="Economic Losses" stackId="a" fill="#8884d8" />
                  <Bar dataKey="insured_losses" name="Insured Losses" stackId="a" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Coverage Gap Percentage by Hazard</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={coverageGapData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hazard_type" />
                  <YAxis yAxisId="left" label={{ value: '%', position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Gap Change', position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="coverage_gap_percentage" name="Coverage Gap %" fill="#8884d8" />
                  <Line yAxisId="right" type="monotone" dataKey="trends.gap_change" name="Gap Change (pp)" stroke="#ff7300" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
      
      {/* Coverage Gap Detailed Analysis */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Coverage Gap Analysis by Hazard Type</h3>
          <button
            onClick={() => downloadCSV(coverageGapData, 'coverage_gap_analysis.csv')}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
          >
            <Download className="h-4 w-4 mr-1" />
            Export Data
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="text-red-500 p-4">Error loading coverage gap data: {error}</div>
        ) : (
          <div className="space-y-6">
            {coverageGapData
              .filter(gap => selectedHazardType === 'all' || gap.hazard_type === selectedHazardType)
              .map((gap, i) => (
                <div key={i} className="border rounded-lg overflow-hidden">
                  <div className={`p-4 ${
                    gap.hazard_type === 'flood' ? 'bg-blue-50' :
                    gap.hazard_type === 'hurricane' ? 'bg-purple-50' :
                    gap.hazard_type === 'wildfire' ? 'bg-orange-50' :
                    gap.hazard_type === 'drought' ? 'bg-yellow-50' :
                    gap.hazard_type === 'storm' ? 'bg-green-50' :
                    'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-lg capitalize">{gap.hazard_type} Coverage Gap Analysis</h4>
                      <div className="flex items-center">
                        <span className="text-3xl font-bold mr-2">{gap.coverage_gap_percentage}%</span>
                        <span className={`text-sm flex items-center ${
                          gap.trends.gap_change > 0 ? 'text-red-600' :
                          gap.trends.gap_change < 0 ? 'text-green-600' :
                          'text-gray-600'
                        }`}>
                          {gap.trends.gap_change > 0 ? '↑' : 
                          gap.trends.gap_change < 0 ? '↓' : '→'} 
                          {Math.abs(gap.trends.gap_change)}pp
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500 mb-1">Economic Losses (B)</div>
                        <div className="text-xl font-semibold">${gap.economic_losses}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500 mb-1">Insured Losses (B)</div>
                        <div className="text-xl font-semibold">${gap.insured_losses}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="text-sm text-gray-500 mb-1">Take-up Rate Trend</div>
                        <div className="text-xl font-semibold flex items-center">
                          {gap.trends.take_up_rate > 0 ? '↑' : 
                          gap.trends.take_up_rate < 0 ? '↓' : '→'} 
                          {Math.abs(gap.trends.take_up_rate)}%
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium mb-2">Key Coverage Challenges:</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {gap.key_challenges.map((challenge, j) => (
                          <li key={j} className="text-gray-700">{challenge}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
              
            {coverageGapData.filter(gap => 
              selectedHazardType === 'all' || gap.hazard_type === selectedHazardType
            ).length === 0 && (
              <div className="text-center py-6 text-gray-500">
                No coverage gap data available for your selected filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render Active Hazards Tab
  const renderActiveHazards = () => (
    <div className="space-y-6">
      {/* Hazards Map placeholder - in production, this would be a real map component */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Active Climate Hazards Map</h3>
        <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
          <p className="text-gray-500">
            Map component would display here, showing active hazards by location.
            <br/>
            In production, this would use the <code>RiskMap.jsx</code> component with live hazard data.
          </p>
        </div>
      </div>
      
      {/* Hazards by Type */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Active Hazards by Type</h3>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hazard</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Areas Affected</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {hazardData.map((hazard, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{hazard.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {hazard.hazard_type === 'flood' && <Droplet className="h-4 w-4 text-blue-500 mr-2" />}
                        {hazard.hazard_type === 'hurricane' && <Wind className="h-4 w-4 text-purple-500 mr-2" />}
                        {hazard.hazard_type === 'wildfire' && <AlertOctagon className="h-4 w-4 text-orange-500 mr-2" />}
                        {hazard.hazard_type === 'drought' && <Thermometer className="h-4 w-4 text-yellow-500 mr-2" />}
                        {hazard.hazard_type === 'storm' && <Umbrella className="h-4 w-4 text-green-500 mr-2" />}
                        {hazard.hazard_type === 'other' && <Info className="h-4 w-4 text-gray-500 mr-2" />}
                        <span className="capitalize">{hazard.hazard_type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        hazard.severity === 'Extreme' ? 'bg-red-100 text-red-800' :
                        hazard.severity === 'Severe' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {hazard.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="capitalize">{hazard.region.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      {hazard.areas_affected?.join(', ') || 'Multiple areas'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            className={`px-4 py-3 font-medium ${activeTab === 'underwriting' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('underwriting')}
          >
            Underwriting Challenges
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'coverage' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('coverage')}
          >
            Coverage Gap Analysis
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'hazards' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('hazards')}
          >
            Active Hazards
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'underwriting' && renderUnderwritingChallenges()}
        {activeTab === 'coverage' && renderCoverageGapAnalysis()}
        {activeTab === 'hazards' && renderActiveHazards()}
      </div>
    </div>
  );
};

export default UnderwritingCoverageAnalysis;