import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import VectorSearch from './VectorSearch.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';

// COLORS
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const TREND_COLORS = {
  increasing: '#FF4560',
  stable: '#00E396',
  decreasing: '#008FFB'
};

const InsuranceClimateDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDomain, setSelectedDomain] = useState(null);
  
  // State for API data
  const [domainRiskScores, setDomainRiskScores] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [riskFactors, setRiskFactors] = useState([]);
  const [sourceDistribution, setSourceDistribution] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [reportData, setReportData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch all necessary data when component mounts
    fetchDashboardData();
  }, []);

  // Updated fetchDashboardData function with better error isolation
const fetchDashboardData = async () => {
  setIsLoading(true);
  
  // Use this to track which data sections succeeded/failed
  const dataStatus = {
    riskScores: false,
    articles: false,
    stats: false,
    report: false
  };
  
  // Start with no errors
  setError(null);
  
  // Fetch domain risk scores
  try {
    const riskScoresResponse = await fetch(`${API_BASE_URL}/domains/risk-scores`);
    if (!riskScoresResponse.ok) throw new Error('Failed to fetch risk scores');
    const riskScoresData = await riskScoresResponse.json();
    setDomainRiskScores(riskScoresData);
    dataStatus.riskScores = true;
    
    // Generate trend data based on current risk scores
    generateTrendData(riskScoresData);
  } catch (err) {
    console.error('Error fetching risk scores:', err);
    // Use fallback data for domain risk scores
    const mockDomainRiskScores = [
      { domain: "property", risk_score: 8.7, contributing_factors: ["Floods", "Wildfires", "Hurricanes"], trend: "increasing" },
      { domain: "casualty", risk_score: 6.5, contributing_factors: ["Liability claims", "Disclosure failures"], trend: "stable" },
      { domain: "life", risk_score: 4.2, contributing_factors: ["Heat-related illness", "Climate mortality"], trend: "stable" },
      { domain: "health", risk_score: 5.8, contributing_factors: ["Vector-borne diseases", "Heat stress"], trend: "increasing" },
      { domain: "reinsurance", risk_score: 7.9, contributing_factors: ["Capacity constraints", "Pricing increases"], trend: "increasing" }
    ];
    setDomainRiskScores(mockDomainRiskScores);
    generateTrendData(mockDomainRiskScores);
  }
  
  // Fetch recent articles
  try {
    const articlesResponse = await fetch(`${API_BASE_URL}/articles?limit=4&min_relevance=8`);
    if (!articlesResponse.ok) throw new Error('Failed to fetch articles');
    const articlesData = await articlesResponse.json();
    setRecentArticles(articlesData);
    dataStatus.articles = true;
  } catch (err) {
    console.error('Error fetching articles:', err);
    // Use fallback data for articles
    const mockRecentArticles = [
      { title: "TNFD Framework Adoption Accelerating", source: "TNFD", date: "2024-04-15", total_relevance: 17 },
      { title: "Extreme Weather Driving Property Insurance Market Hardening", source: "Insurance Journal", date: "2024-04-05", total_relevance: 19 },
      { title: "New Study Shows Coastal Flood Risk Underestimated", source: "Climate Home News", date: "2024-03-22", total_relevance: 19 },
      { title: "Climate Liability Claims Rising as Legal Precedents Emerge", source: "Insurance Business Magazine", date: "2024-04-01", total_relevance: 15 }
    ];
    setRecentArticles(mockRecentArticles);
  }
  
  // Fetch dashboard stats for risk factors and source distribution
  try {
    const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (!statsResponse.ok) throw new Error('Failed to fetch dashboard stats');
    const statsData = await statsResponse.json();
    
    // Transform risk factor data for chart
    const riskFactorData = Object.entries(statsData.risk_factor_frequency || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    setRiskFactors(riskFactorData);
    
    // Transform source distribution data for chart
    const sourceData = Object.entries(statsData.source_distribution || {})
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    setSourceDistribution(sourceData);
    dataStatus.stats = true;
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    // Use fallback data for stats
    const mockRiskFactors = [
      { name: "Floods", value: 23 },
      { name: "Wildfires", value: 18 },
      { name: "Hurricanes", value: 15 },
      { name: "Regulatory compliance", value: 14 },
      { name: "Liability litigation", value: 12 },
      { name: "Sea level rise", value: 10 },
      { name: "Disclosure requirements", value: 9 },
      { name: "Transition risks", value: 8 }
    ];
    setRiskFactors(mockRiskFactors);
    
    const mockSourceDistribution = [
      { name: "Insurance Journal", value: 28 },
      { name: "TNFD", value: 23 },
      { name: "Climate Home News", value: 18 },
      { name: "UNFCCC", value: 15 },
      { name: "Insurance Business Magazine", value: 14 },
      { name: "Other", value: 12 }
    ];
    setSourceDistribution(mockSourceDistribution);
  }
  
  // Fetch latest report - THIS CAN FAIL WITHOUT BREAKING THE DASHBOARD
  try {
    const reportResponse = await fetch(`${API_BASE_URL}/reports/latest`);
    if (reportResponse.ok) {
      const reportData = await reportResponse.json();
      setReportData(reportData);
      dataStatus.report = true;
    } else {
      console.log('No report available yet - this is expected for new installations');
      // Set minimal report data to avoid undefined errors
      setReportData({
        executive_summary: "No climate risk reports have been generated yet. Please run an analysis to generate a report.",
        key_developments: "Run an analysis to identify key climate risk developments.",
        insurance_domain_impacts: "No domain data available yet.",
        recommended_actions: "Run a climate risk analysis to generate a comprehensive report."
      });
    }
  } catch (err) {
    console.error('Error fetching latest report:', err);
    // Set minimal report data
    setReportData({
      executive_summary: "Unable to fetch climate risk report. Please try again later.",
      key_developments: "Report data unavailable.",
      insurance_domain_impacts: "Report data unavailable.",
      recommended_actions: "Try running analysis again or check system logs."
    });
  }
  
  // Only show error message if multiple data sections failed
  const failedSections = Object.values(dataStatus).filter(status => !status).length;
  if (failedSections >= 2) {
    setError(`Failed to load ${failedSections} data sections. Using fallback data where possible.`);
  }
  
  setIsLoading(false);
};

  // Set fallback data if API fails
  const setFallbackData = () => {
    // Mock domain risk scores
    const mockDomainRiskScores = [
      { domain: "property", risk_score: 8.7, contributing_factors: ["Floods", "Wildfires", "Hurricanes"], trend: "increasing" },
      { domain: "casualty", risk_score: 6.5, contributing_factors: ["Liability claims", "Disclosure failures"], trend: "stable" },
      { domain: "life", risk_score: 4.2, contributing_factors: ["Heat-related illness", "Climate mortality"], trend: "stable" },
      { domain: "health", risk_score: 5.8, contributing_factors: ["Vector-borne diseases", "Heat stress"], trend: "increasing" },
      { domain: "reinsurance", risk_score: 7.9, contributing_factors: ["Capacity constraints", "Pricing increases"], trend: "increasing" }
    ];
    setDomainRiskScores(mockDomainRiskScores);
    
    // Mock recent articles
    const mockRecentArticles = [
      { title: "TNFD Framework Adoption Accelerating", source: "TNFD", date: "2024-04-15", total_relevance: 17 },
      { title: "Extreme Weather Driving Property Insurance Market Hardening", source: "Insurance Journal", date: "2024-04-05", total_relevance: 19 },
      { title: "New Study Shows Coastal Flood Risk Underestimated", source: "Climate Home News", date: "2024-03-22", total_relevance: 19 },
      { title: "Climate Liability Claims Rising as Legal Precedents Emerge", source: "Insurance Business Magazine", date: "2024-04-01", total_relevance: 15 }
    ];
    setRecentArticles(mockRecentArticles);
    
    // Mock risk factors
    const mockRiskFactors = [
      { name: "Floods", value: 23 },
      { name: "Wildfires", value: 18 },
      { name: "Hurricanes", value: 15 },
      { name: "Regulatory compliance", value: 14 },
      { name: "Liability litigation", value: 12 },
      { name: "Sea level rise", value: 10 },
      { name: "Disclosure requirements", value: 9 },
      { name: "Transition risks", value: 8 }
    ];
    setRiskFactors(mockRiskFactors);
    
    // Mock source distribution
    const mockSourceDistribution = [
      { name: "Insurance Journal", value: 28 },
      { name: "TNFD", value: 23 },
      { name: "Climate Home News", value: 18 },
      { name: "UNFCCC", value: 15 },
      { name: "Insurance Business Magazine", value: 14 },
      { name: "Other", value: 12 }
    ];
    setSourceDistribution(mockSourceDistribution);
    
    // Generate trend data
    generateTrendData(mockDomainRiskScores);
    
    // Mock report data
    const mockReportData = {
      executive_summary: "Recent climate risk developments show increasing regulatory pressure and physical risks affecting insurers. Property insurance faces rising claims from extreme weather, while casualty insurers see growing liability concerns from climate disclosure requirements. Reinsurance capacity is tightening in high-risk regions, and opportunities are emerging for insurers with sophisticated climate risk modeling capabilities.",
      key_developments: "1. **TNFD framework adoption accelerating** across financial sectors with major institutions beginning implementation\n\n2. **Record-breaking hurricane season projected** for Atlantic basin with potential increased property damage\n\n3. **EU strengthening climate disclosure requirements** for insurers with new regulations taking effect\n\n4. **New research shows flood risk underestimated** in coastal property portfolios by as much as 30%\n\n5. **Legal precedents emerging** for climate liability claims against corporations and their directors",
      insurance_domain_impacts: "property: Facing increased frequency and severity of weather-related claims, particularly in coastal and wildfire-prone regions. Catastrophe models require updating with latest climate projections. Premium increases and coverage restrictions likely in high-risk zones.\n\ncasualty: Growing exposure to liability claims related to climate disclosure failures and transition risks. Directors and officers particularly exposed as shareholders demand climate action. Environmental liability coverages seeing increased claims activity.\n\nhealth: Emerging risks from heat-related illnesses and changing disease patterns affect actuarial assumptions. Healthcare facilities in climate-vulnerable regions facing business continuity challenges.\n\nlife: Long-term mortality assumptions need recalibration to account for climate impacts on longevity. Investment portfolios face transition risks from high-carbon assets.\n\nreinsurance: Capacity constraints emerging in high-risk zones with corresponding premium increases. Opportunity to develop innovative risk transfer mechanisms for climate resilience.",
      recommended_actions: "1. **Enhance catastrophe modeling** with latest climate science and scenario planning\n\n2. **Develop climate stress testing** across all business lines with 10/50/100 year projections\n\n3. **Review underwriting guidelines** for high-risk regions and industries in transition\n\n4. **Increase pricing sophistication** for climate-vulnerable properties with more granular risk factors\n\n5. **Engage proactively with regulators** on emerging disclosure frameworks to shape outcomes\n\n6. **Partner with climate resilience initiatives** to reduce overall risk exposure and develop expertise",
      generated_date: "2024-04-19"
    };
    setReportData(mockReportData);
  };

  // Generate trend data based on current risk scores
  const generateTrendData = (currentScores) => {
    const months = ['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024'];
    const trendData = months.map((month, index) => {
      const entry = { month };
      
      currentScores.forEach(domain => {
        // Create decreasing trend backward from current scores
        const factor = index === 3 ? 1 : 0.85 + (index * 0.05);
        entry[domain.domain.charAt(0).toUpperCase() + domain.domain.slice(1)] = 
          index === 3 ? domain.risk_score : (domain.risk_score * factor).toFixed(1);
      });
      
      return entry;
    });
    
    setTrendData(trendData);
  };

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain === selectedDomain ? null : domain);
  };

  // Function to run a new analysis
  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ run_full_pipeline: true })
      });
      
      if (!response.ok) throw new Error('Failed to start analysis');
      
      // Show success message
      alert('Analysis started successfully. This may take several minutes to complete.');
      
      // Optionally poll for completion status
      
    } catch (err) {
      console.error('Error starting analysis:', err);
      setError(err.message);
      alert('Error starting analysis: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse domain report formatted text
  const formatDomainReport = (text) => {
    if (!text) return {};
    
    const domains = ['property', 'casualty', 'health', 'life', 'reinsurance'];
    const result = {};
    
    domains.forEach(domain => {
      const regex = new RegExp(`${domain}:\\s*(.*?)(?=\\n\\n|$)`, 'is');
      const match = text.match(regex);
      result[domain] = match ? match[1].trim() : '';
    });
    
    return result;
  };

  

  

  // Parse markdown text with formatting
  const formatMarkdownText = (text) => {
    if (!text) return text;
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '<br/><br/>');
  };
    // ref to the report container
    const reportRef = useRef();

    // PDF download handler
    const downloadReportAsPDF = async () => {
      if (!reportRef.current) return;
    
      // 1) Snapshot the HTML at high resolution
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
    
      // 2) Create jsPDF in pt units (A4 = 595×842 pt)
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 40; // 40pt ≈ 0.56in margins
    
      // 3) Compute image dimensions to fit inside margins
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
      let remainingHeight = imgHeight;
      let positionY = margin;
    
      // 4) Add pages until the entire image is placed
      while (remainingHeight > 0) {
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          positionY,
          imgWidth,
          imgHeight
        );
    
        // Draw a border around the page content
        pdf.setDrawColor(200);
        pdf.setLineWidth(1);
        pdf.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
    
        remainingHeight -= (pageHeight - margin * 2);
        if (remainingHeight > 0) {
          pdf.addPage();
          positionY = - (imgHeight - (pageHeight - margin * 2) * (Math.floor(imgHeight / (pageHeight - margin * 2))));
        }
      }
    
      // 5) Save!
      pdf.save('Climate_Risk_Report.pdf');
    };
    
    // 1. Build the domain→text map…
    const domainReports = formatDomainReport(reportData.insurance_domain_impacts);
    // 2. Filter out any domain with empty text
    const activeDomains = Object
      .entries(domainReports)
      .filter(([_, text]) => text && text.trim().length > 0);
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Climate Risk Intelligence</h1>
            <div className="flex space-x-2">
              <button 
                className="px-3 py-1 bg-blue-700 rounded-md hover:bg-blue-600"
                onClick={runAnalysis}
                disabled={isLoading}
              >
                {isLoading ? 'Running...' : 'Run Analysis'}
              </button>
              <button className="px-3 py-1 bg-blue-700 rounded-md hover:bg-blue-600">
                Settings
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-4">
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'dashboard' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'reports' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'articles' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('articles')}
            >
              Articles
            </button>
            <button 
              className={`px-4 py-3 font-medium ${activeTab === 'domains' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
              onClick={() => setActiveTab('domains')}
            >
              Insurance Domains
            </button>
            <button 
            className={`px-4 py-3 font-medium ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('search')}
          >
            Semantic Search
          </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <h3 className="text-lg font-medium">Error loading data</h3>
            <p>{error}</p>
            <p className="text-sm mt-2">Using fallback data for demonstration purposes.</p>
            <button 
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700"
              onClick={fetchDashboardData}
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Risk Score Summary */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-xl font-semibold mb-4">Current Risk Scores by Insurance Domain</h2>
                  <div className="overflow-x-auto">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {domainRiskScores.map((domain) => (
                        <div 
                          key={domain.domain}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedDomain === domain.domain ? 
                            'bg-blue-100 border border-blue-300' : 
                            'bg-white border border-gray-200 hover:bg-blue-50'
                          }`}
                          onClick={() => handleDomainSelect(domain.domain)}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium capitalize">{domain.domain}</h3>
                            <span 
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                domain.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                                domain.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {domain.trend === 'increasing' ? '↑' : 
                               domain.trend === 'decreasing' ? '↓' : '→'} 
                              {domain.trend}
                            </span>
                          </div>
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-2 text-xs flex rounded bg-gray-200">
                              <div 
                                style={{ width: `${(domain.risk_score/10) * 100}%` }} 
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                  domain.risk_score >= 7.5 ? 'bg-red-500' :
                                  domain.risk_score >= 5 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                              ></div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Risk Level</span>
                            <span className="font-semibold">{domain.risk_score.toFixed(1)}/10</span>
                          </div>
                          {selectedDomain === domain.domain && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-1">Key Risk Factors:</p>
                              <ul className="text-sm text-gray-600">
                                {domain.contributing_factors.map((factor, index) => (
                                  <li key={index} className="flex items-center">
                                    <span className="mr-1">•</span> {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Risk Factors Chart */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-xl font-semibold mb-4">Top Risk Factors</h2>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={riskFactors}
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0088FE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Source Distribution Chart */}
                  <div className="bg-white rounded-lg shadow p-4">
                    <h2 className="text-xl font-semibold mb-4">Source Distribution</h2>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sourceDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {sourceDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Risk Trend Chart */}
                <div className="bg-white rounded-lg shadow p-4">
                  <h2 className="text-xl font-semibold mb-4">Risk Score Trends (Last 4 Months)</h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="Property" stroke="#FF8042" strokeWidth={2} />
                        <Line type="monotone" dataKey="Casualty" stroke="#00C49F" strokeWidth={2} />
                        <Line type="monotone" dataKey="Health" stroke="#FFBB28" strokeWidth={2} />
                        <Line type="monotone" dataKey="Life" stroke="#0088FE" strokeWidth={2} />
                        <Line type="monotone" dataKey="Reinsurance" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Recent Articles */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent High-Impact Articles</h2>
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      onClick={() => setActiveTab('articles')}
                    >
                      View All →
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relevance</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentArticles.map((article, index) => (
                          <tr key={index} className="hover:bg-gray-50 cursor-pointer">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{article.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.source}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{article.date}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <span className="mr-2">{article.total_relevance ? article.total_relevance.toFixed(1) : 'N/A'}</span>
                                <div className="relative w-24 h-2 bg-gray-200 rounded">
                                  <div 
                                    className="absolute top-0 left-0 h-2 rounded bg-blue-600" 
                                    style={{ width: `${article.total_relevance ? (article.total_relevance / 20) * 100 : 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

{activeTab === 'reports' && (
  <div className="bg-white rounded-lg shadow p-6">
    <h2 className="text-2xl font-bold text-gray-800 mb-6">Climate Risk Intelligence Report</h2>
    
        <div
      ref={reportRef}
      className="bg-white p-8 border border-gray-300 rounded-lg space-y-8"
      style={{ width: '800px', margin: '0 auto' }} // optional: fix width & center
    >
      {/* Executive Summary */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Executive Summary</h3>
        <p className="text-gray-600">{reportData.executive_summary}</p>
      </div>

      {/* Key Developments */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Key Climate Risk Developments</h3>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: formatMarkdownText(reportData.key_developments) }}
        />
      </div>

      {/* Domain Impacts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Insurance Domain Impacts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {Object.entries(activeDomains.map(([domain, text]) => (
            <div key={domain} className="p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium capitalize mb-1">{domain} Insurance</h4>
              <p className="text-gray-700 text-sm">{text}</p>
            </div>
          )))}
        

        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Recommended Actions</h3>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: formatMarkdownText(reportData.recommended_actions) }}
        /> 
      </div>
    </div>

    {/* Buttons */}
    <div className="mt-6 flex justify-end space-x-2">
      <button
        onClick={downloadReportAsPDF}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
      >
        Download PDF
      </button>
      <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
        Share Report
      </button>
    </div>
  </div>
)}

            {activeTab === 'articles' && (
              <ArticlesTab apiBaseUrl={API_BASE_URL} />
            )}

            {activeTab === 'domains' && (
              <div className="space-y-6">
                {domainRiskScores.map((domain) => (
                  <div key={domain.domain} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold capitalize">{domain.domain} Insurance</h2>
                        <div className="flex items-center">
                          <span className="text-sm mr-2">Risk Score:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            domain.risk_score >= 7.5 ? 'bg-red-100 text-red-800' :
                            domain.risk_score >= 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {domain.risk_score.toFixed(1)}/10
                          </span>
                          <span 
                            className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              domain.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                              domain.trend === 'decreasing' ? 'bg-green-100 text-green-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {domain.trend === 'increasing' ? '↑' : 
                             domain.trend === 'decreasing' ? '↓' : '→'} 
                            {domain.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-2">
                          <h3 className="text-lg font-medium mb-3">Key Risk Factors</h3>
                          <div className="space-y-3">
                            {domain.contributing_factors.map((factor, index) => (
                              <div key={index} className="flex items-start p-3 border border-gray-200 rounded-md">
                                <div className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full ${
                                  index === 0 ? 'bg-red-500' :
                                  index === 1 ? 'bg-orange-500' :
                                  'bg-yellow-500'
                                }`}></div>
                                <div className="ml-3">
                                  <h4 className="font-medium">{factor}</h4>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {index === 0 ? 
                                      `${factor} presents significant challenges for ${domain.domain.toLowerCase()} insurance through increased frequency and severity of related claims.` :
                                      `${factor} are impacting risk assessment and pricing models for ${domain.domain.toLowerCase()} insurance products.`}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <h3 className="text-lg font-medium mt-6 mb-3">Business Implications</h3>
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <ul className="space-y-2">
                              <li className="flex items-start">
                                <span className="inline-block w-5 text-blue-600">•</span>
                                <span>Adjustments to underwriting criteria and coverage limitations in high-risk areas.</span>
                              </li>
                              <li className="flex items-start">
                                <span className="inline-block w-5 text-blue-600">•</span>
                                <span>Premium increases to account for changing risk profiles and loss patterns.</span>
                              </li>
                              <li className="flex items-start">
                                <span className="inline-block w-5 text-blue-600">•</span>
                                <span>Need for more sophisticated climate risk modeling capabilities.</span>
                              </li>
                              <li className="flex items-start">
                                <span className="inline-block w-5 text-blue-600">•</span>
                                <span>Opportunity to develop innovative products addressing specific climate-related challenges.</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Risk Score Trend</h3>
                          <div className="h-60 bg-white p-2 border border-gray-200 rounded-md">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={trendData}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                                <Tooltip />
                                <Line 
                                  type="monotone" 
                                  dataKey={domain.domain.charAt(0).toUpperCase() + domain.domain.slice(1)} 
                                  stroke={
                                    domain.domain === "property" ? "#FF8042" :
                                    domain.domain === "casualty" ? "#00C49F" :
                                    domain.domain === "health" ? "#FFBB28" :
                                    domain.domain === "life" ? "#0088FE" :
                                    "#8884d8"
                                  } 
                                  strokeWidth={2} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <h3 className="text-lg font-medium mt-6 mb-3">Related Regulations</h3>
                          <div className="space-y-3">
                            <div className="p-3 border border-blue-200 bg-blue-50 rounded-md">
                              <h4 className="font-medium text-blue-800">TNFD Framework</h4>
                              <p className="text-sm mt-1">Requires disclosures of nature-related risks affecting insurance portfolios.</p>
                            </div>
                            <div className="p-3 border border-green-200 bg-green-50 rounded-md">
                              <h4 className="font-medium text-green-800">EU Climate Disclosure</h4>
                              <p className="text-sm mt-1">Enhanced requirements for reporting climate impacts on insurance business.</p>
                            </div>
                          </div>
                          
                          <button className="w-full mt-6 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                            View Full Domain Report
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-8 border-t border-gray-200 pt-6">
                        <h3 className="text-lg font-medium mb-4">Recent Articles Related to {domain.domain.charAt(0).toUpperCase() + domain.domain.slice(1)} Insurance</h3>
                        <DomainArticles domain={domain.domain} apiBaseUrl={API_BASE_URL} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'search' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Semantic Search & Topic Analysis</h2>
              <VectorSearchComponent />
            </div>
          )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">© 2025 Climate Risk Intelligence Platform</p>
            </div>
            <div className="flex space-x-4">
              <a href="#" className="text-sm text-gray-300 hover:text-white">Terms of Service</a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">Privacy Policy</a>
              <a href="#" className="text-sm text-gray-300 hover:text-white">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};



// Articles Tab Component
const ArticlesTab = ({ apiBaseUrl }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    source: '',
    domain: '',
    searchTerm: ''
  });

  const articlesPerPage = 10;

  useEffect(() => {
    fetchArticles();
  }, [page, filters]);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      let url = `${apiBaseUrl}/articles?skip=${page * articlesPerPage}&limit=${articlesPerPage}`;
      
      if (filters.source) {
        url += `&source=${encodeURIComponent(filters.source)}`;
      }
      
      // This assumes your API has a way to filter by domain
      // You might need to adjust this based on your actual API capabilities
      if (filters.domain) {
        url += `&domain=${encodeURIComponent(filters.domain)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch articles');
      
      const data = await response.json();
      setArticles(data);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError(err.message);
      
      // Set mock data for demonstration
      setMockArticles();
    } finally {
      setIsLoading(false);
    }
  };

  // Set mock articles if API fails
  const setMockArticles = () => {
    const mockArticles = [
      {
        title: "TNFD Framework Adoption Accelerating Among Insurers",
        source: "TNFD",
        source_type: "regulatory",
        date: "2024-04-15",
        content: "Major financial institutions have begun reporting against the Taskforce on Nature-related Financial Disclosures (TNFD) framework, marking a significant step in addressing nature and climate risks in financial decision-making.",
        total_relevance: 17.5
      },
      {
        title: "New Study Shows Coastal Flood Risk Underestimated by 30%",
        source: "Climate Home News",
        source_type: "news",
        date: "2024-04-12",
        content: "A comprehensive new study published in Nature Climate Change indicates that flood risk in coastal properties is underestimated by as much as 30% in current valuation models.",
        total_relevance: 19.2
      },
      {
        title: "Climate Liability Claims Rising as Legal Precedents Emerge",
        source: "Insurance Business Magazine",
        source_type: "industry",
        date: "2024-04-08",
        content: "Casualty insurers are seeing an uptick in climate-related liability claims as new legal precedents emerge holding companies accountable for climate impacts and disclosure failures.",
        total_relevance: 16.8
      },
      {
        title: "Health Insurers Begin Accounting for Climate-Related Illness Trends",
        source: "Insurance Journal",
        source_type: "industry",
        date: "2024-04-05",
        content: "Health insurers are increasingly incorporating climate risk factors into their actuarial models as evidence mounts for climate-related health impacts.",
        total_relevance: 15.3
      },
      {
        title: "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions",
        source: "Insurance Business Magazine",
        source_type: "industry",
        date: "2024-04-02",
        content: "Reinsurance capacity is contracting significantly for climate-vulnerable regions following several years of elevated catastrophe losses.",
        total_relevance: 18.7
      }
    ];
    
    setArticles(mockArticles);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset to first page when filters change
    setPage(0);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // The search is handled by the useEffect that watches filters
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Climate Risk Articles</h2>
        <p className="text-gray-600 mt-1">Search and filter articles from various sources</p>
        
        <form onSubmit={handleSearch} className="mt-4 flex flex-col md:flex-row gap-4">
          <div className="flex-grow">
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              name="source"
              value={filters.source}
              onChange={handleFilterChange}
            >
              <option value="">All Sources</option>
              <option value="TNFD">TNFD</option>
              <option value="Insurance Journal">Insurance Journal</option>
              <option value="Climate Home News">Climate Home News</option>
              <option value="UNFCCC">UNFCCC</option>
            </select>
            <select 
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              name="domain"
              value={filters.domain}
              onChange={handleFilterChange}
            >
              <option value="">All Domains</option>
              <option value="property">Property</option>
              <option value="casualty">Casualty</option>
              <option value="health">Health</option>
              <option value="life">Life</option>
              <option value="reinsurance">Reinsurance</option>
            </select>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Filter
            </button>
          </div>
        </form>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 text-red-600">
          <p>Error: {error}</p>
          <p className="text-sm text-gray-500 mt-1">Showing mock data for demonstration purposes.</p>
          <button 
            onClick={fetchArticles} 
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-1 gap-4">
            {articles.length > 0 ? (
              articles.map((article, index) => (
                <div key={index} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                  <div className="flex justify-between">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      article.source_type === 'regulatory' ? 'bg-blue-100 text-blue-800' :
                      article.source_type === 'industry' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.source_type || 'News'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {article.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-blue-600 mt-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mt-2 line-clamp-2">
                    {article.content ? (
                      article.content.length > 200 ? article.content.substring(0, 200) + '...' : article.content
                    ) : 'No content available'}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-sm text-gray-500">
                      Source: {article.source}
                    </span>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">Relevance:</span>
                      <div className="relative w-20 h-2 bg-gray-200 rounded">
                        <div 
                          className="absolute top-0 left-0 h-2 rounded bg-blue-600" 
                          style={{ width: `${(article.total_relevance || 0) / 20 * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm ml-2">{article.total_relevance ? article.total_relevance.toFixed(1) : 'N/A'}/20</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500">No articles found matching your criteria.</p>
              </div>
            )}
          </div>
          
          {articles.length > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                Showing {page * articlesPerPage + 1} to {page * articlesPerPage + articles.length} items
              </div>
              <div className="flex">
                <button 
                  className="px-3 py-1 border border-gray-300 rounded-l-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <button 
                  className="px-3 py-1 bg-blue-600 text-white border border-blue-600"
                >
                  {page + 1}
                </button>
                <button 
                  className="px-3 py-1 border border-gray-300 rounded-r-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setPage(page + 1)}
                  disabled={articles.length < articlesPerPage}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Domain Articles Component
const DomainArticles = ({ domain, apiBaseUrl }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDomainArticles = async () => {
      setIsLoading(true);
      try {
        // This is a simplified approach - your API might need a different query structure
        const response = await fetch(`${apiBaseUrl}/structured-summaries?domain=${domain}&limit=3`);
        if (!response.ok) throw new Error('Failed to fetch domain articles');
        
        const data = await response.json();
        setArticles(data);
      } catch (error) {
        console.error(`Error fetching articles for ${domain}:`, error);
        setError(error.message);
        // Use sample data on error
        setMockDomainArticles(domain);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDomainArticles();
  }, [domain, apiBaseUrl]);
  
  // Set mock domain articles if API fails
  const setMockDomainArticles = (domain) => {
    const mockArticles = [
      {
        key_event: domain === "property" ? 
          "Extreme Weather Driving Property Insurance Market Hardening" :
          domain === "casualty" ?
          "Climate Liability Claims on the Rise as Legal Precedents Emerge" :
          domain === "health" ?
          "Health Insurers Begin Accounting for Climate-Related Illness Trends" :
          domain === "life" ?
          "Climate Change Impacts on Mortality Assumptions for Life Insurers" :
          "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions",
        source: "Insurance Journal",
        date: "2024-04-10",
        confidence: "High"
      },
      {
        key_event: domain === "property" ? 
          "New Study Shows Coastal Flood Risk Underestimated by 30%" :
          domain === "casualty" ?
          "Directors and Officers Facing Increased Climate Risk Exposure" :
          domain === "health" ?
          "Heat-related illness claims projected to rise with global temperatures" :
          domain === "life" ?
          "Life Insurance Portfolios Facing Transition Risks from High-Carbon Assets" :
          "Reinsurance Premiums Increase by 25% in Hurricane-Prone Regions",
        source: "Climate Home News",
        date: "2024-04-05",
        confidence: "Medium"
      },
      {
        key_event: domain === "property" ? 
          "Record-breaking hurricane season projected for Atlantic basin" :
          domain === "casualty" ?
          "Environmental liability claims increasing across multiple sectors" :
          domain === "health" ?
          "Vector-borne diseases expanding geographic range due to climate change" :
          domain === "life" ?
          "Long-term mortality projections adjusted for climate scenarios" :
          "New parametric risk transfer mechanisms emerging for climate risks",
        source: "Insurance Business Magazine",
        date: "2024-03-28",
        confidence: "Medium"
      }
    ];
    
    setArticles(mockArticles);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error && articles.length === 0) {
    return (
      <div className="p-4 text-red-600 text-sm">
        <p>Error loading articles: {error}</p>
        <p className="text-gray-500 mt-1">Showing mock data for demonstration.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {articles.length > 0 ? (
        articles.map((article, index) => (
          <div key={index} className="p-3 border border-gray-200 rounded-md hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-blue-600">
                  {article.key_event || article.title || `Climate impact on ${domain} insurance`}
                </h4>
              
                <div className="flex items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {article.source}
                  </span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-xs text-gray-500">
                    {article.date}
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  article.confidence === 'High' ? 'bg-red-100 text-red-800' :
                  article.confidence === 'Medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {article.confidence || 'High'} Relevance
                </span>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-gray-500">
          No recent articles found for {domain} insurance.
        </div>
      )}
    </div>
  );
};

export default InsuranceClimateDashboard;