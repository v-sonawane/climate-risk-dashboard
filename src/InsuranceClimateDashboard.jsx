import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './styles.css'
// Mock data based on the API structure we've designed
const mockDomainRiskScores = [
  { domain: "Property", risk_score: 8.7, contributing_factors: ["Floods", "Wildfires", "Hurricanes"], trend: "increasing" },
  { domain: "Casualty", risk_score: 6.5, contributing_factors: ["Liability claims", "Disclosure failures"], trend: "stable" },
  { domain: "Life", risk_score: 4.2, contributing_factors: ["Heat-related illness", "Climate mortality"], trend: "stable" },
  { domain: "Health", risk_score: 5.8, contributing_factors: ["Vector-borne diseases", "Heat stress"], trend: "increasing" },
  { domain: "Reinsurance", risk_score: 7.9, contributing_factors: ["Capacity constraints", "Pricing increases"], trend: "increasing" }
];

const mockRecentArticles = [
  { title: "TNFD Framework Adoption Accelerating", source: "TNFD", date: "2024-04-15", total_relevance: 17 },
  { title: "Extreme Weather Driving Property Insurance Market Hardening", source: "Insurance Journal", date: "2024-04-05", total_relevance: 19 },
  { title: "New Study Shows Coastal Flood Risk Underestimated", source: "Climate Home News", date: "2024-03-22", total_relevance: 19 },
  { title: "Climate Liability Claims Rising as Legal Precedents Emerge", source: "Insurance Business Magazine", date: "2024-04-01", total_relevance: 15 }
];

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

const mockSourceDistribution = [
  { name: "Insurance Journal", value: 28 },
  { name: "TNFD", value: 23 },
  { name: "Climate Home News", value: 18 },
  { name: "UNFCCC", value: 15 },
  { name: "Insurance Business Magazine", value: 14 },
  { name: "Other", value: 12 }
];

const mockTrendData = [
  {
    month: 'Jan 2024',
    Property: 5.2,
    Casualty: 4.3,
    Health: 3.8,
    Life: 2.9,
    Reinsurance: 4.8
  },
  {
    month: 'Feb 2024',
    Property: 6.1,
    Casualty: 4.7,
    Health: 4.2,
    Life: 3.1,
    Reinsurance: 5.3
  },
  {
    month: 'Mar 2024',
    Property: 7.3,
    Casualty: 5.2,
    Health: 4.8,
    Life: 3.5,
    Reinsurance: 6.1
  },
  {
    month: 'Apr 2024',
    Property: 8.7,
    Casualty: 6.5,
    Health: 5.8,
    Life: 4.2,
    Reinsurance: 7.9
  }
];

const mockReportData = {
  executive_summary: "Recent climate risk developments show increasing regulatory pressure and physical risks affecting insurers. Property insurance faces rising claims from extreme weather, while casualty insurers see growing liability concerns from climate disclosure requirements. Reinsurance capacity is tightening in high-risk regions, and opportunities are emerging for insurers with sophisticated climate risk modeling capabilities.",
  key_developments: "1. **TNFD framework adoption accelerating** across financial sectors with major institutions beginning implementation\n\n2. **Record-breaking hurricane season projected** for Atlantic basin with potential increased property damage\n\n3. **EU strengthening climate disclosure requirements** for insurers with new regulations taking effect\n\n4. **New research shows flood risk underestimated** in coastal property portfolios by as much as 30%\n\n5. **Legal precedents emerging** for climate liability claims against corporations and their directors",
  insurance_domain_impacts: {
    property: "Facing increased frequency and severity of weather-related claims, particularly in coastal and wildfire-prone regions. Catastrophe models require updating with latest climate projections. Premium increases and coverage restrictions likely in high-risk zones.",
    casualty: "Growing exposure to liability claims related to climate disclosure failures and transition risks. Directors and officers particularly exposed as shareholders demand climate action. Environmental liability coverages seeing increased claims activity.",
    health: "Emerging risks from heat-related illnesses and changing disease patterns affect actuarial assumptions. Healthcare facilities in climate-vulnerable regions facing business continuity challenges.",
    life: "Long-term mortality assumptions need recalibration to account for climate impacts on longevity. Investment portfolios face transition risks from high-carbon assets.",
    reinsurance: "Capacity constraints emerging in high-risk zones with corresponding premium increases. Opportunity to develop innovative risk transfer mechanisms for climate resilience."
  },
  recommended_actions: "1. **Enhance catastrophe modeling** with latest climate science and scenario planning\n\n2. **Develop climate stress testing** across all business lines with 10/50/100 year projections\n\n3. **Review underwriting guidelines** for high-risk regions and industries in transition\n\n4. **Increase pricing sophistication** for climate-vulnerable properties with more granular risk factors\n\n5. **Engage proactively with regulators** on emerging disclosure frameworks to shape outcomes\n\n6. **Partner with climate resilience initiatives** to reduce overall risk exposure and develop expertise"
};

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
  
  // In a real application, these states would be populated from API calls
  const [domainRiskScores, setDomainRiskScores] = useState(mockDomainRiskScores);
  const [recentArticles, setRecentArticles] = useState(mockRecentArticles);
  const [riskFactors, setRiskFactors] = useState(mockRiskFactors);
  const [sourceDistribution, setSourceDistribution] = useState(mockSourceDistribution);
  const [trendData, setTrendData] = useState(mockTrendData);
  const [reportData, setReportData] = useState(mockReportData);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // In a real application, we would fetch data from the API here
    // Example:
    // const fetchDashboardData = async () => {
    //   setIsLoading(true);
    //   try {
    //     const response = await fetch('http://localhost:8000/dashboard/stats');
    //     const data = await response.json();
    //     // Update state with fetched data
    //   } catch (error) {
    //     console.error('Error fetching dashboard data:', error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchDashboardData();
  }, []);

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain === selectedDomain ? null : domain);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Climate Risk Intelligence</h1>
            <div className="flex space-x-2">
              <button className="px-3 py-1 bg-blue-700 rounded-md hover:bg-blue-600">
                Run Analysis
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
                            <h3 className="font-medium">{domain.domain}</h3>
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
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
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
                                <span className="mr-2">{article.total_relevance}</span>
                                <div className="relative w-24 h-2 bg-gray-200 rounded">
                                  <div 
                                    className="absolute top-0 left-0 h-2 rounded bg-blue-600" 
                                    style={{ width: `${(article.total_relevance / 20) * 100}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center mt-6">
                    <div className="text-sm text-gray-500">
                      Showing 5 of 42 articles
                    </div>
                    <div className="flex">
                      <button className="px-3 py-1 border border-gray-300 rounded-l-md hover:bg-gray-100">Previous</button>
                      <button className="px-3 py-1 bg-blue-600 text-white border border-blue-600">1</button>
                      <button className="px-3 py-1 border border-gray-300 hover:bg-gray-100">2</button>
                      <button className="px-3 py-1 border border-gray-300 hover:bg-gray-100">3</button>
                      <button className="px-3 py-1 border border-gray-300 rounded-r-md hover:bg-gray-100">Next</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Climate Risk Intelligence Report</h2>
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Executive Summary</h3>
                  <p className="text-gray-600">{reportData.executive_summary}</p>
                </div>
                
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Key Climate Risk Developments</h3>
                  <div className="prose" dangerouslySetInnerHTML={{ __html: reportData.key_developments.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '<br/><br/>') }} />
                </div>
                
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Insurance Domain Impacts</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                      <h4 className="font-medium text-orange-800 mb-2">Property Insurance</h4>
                      <p className="text-gray-700 text-sm">{reportData.insurance_domain_impacts.property}</p>
                    </div>
                    
                    <div className="border border-green-200 bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Casualty Insurance</h4>
                      <p className="text-gray-700 text-sm">{reportData.insurance_domain_impacts.casualty}</p>
                    </div>
                    
                    <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-800 mb-2">Health Insurance</h4>
                      <p className="text-gray-700 text-sm">{reportData.insurance_domain_impacts.health}</p>
                    </div>
                    
                    <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Life Insurance</h4>
                      <p className="text-gray-700 text-sm">{reportData.insurance_domain_impacts.life}</p>
                    </div>
                    
                    <div className="border border-purple-200 bg-purple-50 p-4 rounded-lg md:col-span-2">
                      <h4 className="font-medium text-purple-800 mb-2">Reinsurance</h4>
                      <p className="text-gray-700 text-sm">{reportData.insurance_domain_impacts.reinsurance}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Recommended Actions</h3>
                  <div className="prose" dangerouslySetInnerHTML={{ __html: reportData.recommended_actions.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '<br/><br/>') }} />
                </div>
                
                <div className="text-right mt-6">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 mr-2">
                    Download PDF
                  </button>
                  <button className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700">
                    Share Report
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'articles' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h2 className="text-xl font-semibold">Climate Risk Articles</h2>
                  <p className="text-gray-600 mt-1">Search and filter articles from various sources</p>
                  
                  <div className="mt-4 flex flex-col md:flex-row gap-4">
                    <div className="flex-grow">
                      <input 
                        type="text" 
                        placeholder="Search articles..." 
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2">
                      <select className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Sources</option>
                        <option value="TNFD">TNFD</option>
                        <option value="Insurance Journal">Insurance Journal</option>
                        <option value="Climate Home News">Climate Home News</option>
                        <option value="UNFCCC">UNFCCC</option>
                      </select>
                      <select className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">All Domains</option>
                        <option value="property">Property</option>
                        <option value="casualty">Casualty</option>
                        <option value="health">Health</option>
                        <option value="life">Life</option>
                        <option value="reinsurance">Reinsurance</option>
                      </select>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Filter
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* This would typically be populated from API data */}
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                        <div className="flex justify-between">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            index % 3 === 0 ? 'bg-blue-100 text-blue-800' :
                            index % 3 === 1 ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {index % 3 === 0 ? 'Regulatory' : 
                             index % 3 === 1 ? 'Industry' : 'News'}
                          </span>
                          <span className="text-sm text-gray-500">
                            April {15 - index}, 2024
                          </span>
                        </div>
                        <h3 className="text-lg font-medium text-blue-600 mt-2">
                          {index === 0 ? 'TNFD Framework Adoption Accelerating Among Insurers' :
                           index === 1 ? 'New Study Shows Coastal Flood Risk Underestimated by 30%' :
                           index === 2 ? 'Climate Liability Claims Rising as Legal Precedents Emerge' :
                           index === 3 ? 'Health Insurers Begin Accounting for Climate-Related Illness Trends' :
                           'Reinsurance Capacity Shrinks for Climate-Vulnerable Regions'}
                        </h3>
                        <p className="text-gray-600 mt-2 line-clamp-2">
                          {index === 0 ? 'Major financial institutions have begun reporting against the Taskforce on Nature-related Financial Disclosures (TNFD) framework, marking a significant step in addressing nature and climate risks in financial decision-making.' :
                           index === 1 ? 'A comprehensive new study published in Nature Climate Change indicates that flood risk in coastal properties is underestimated by as much as 30% in current valuation models.' :
                           index === 2 ? 'Casualty insurers are seeing an uptick in climate-related liability claims as new legal precedents emerge holding companies accountable for climate impacts and disclosure failures.' :
                           index === 3 ? 'Health insurers are increasingly incorporating climate risk factors into their actuarial models as evidence mounts for climate-related health impacts.' :
                           'Reinsurance capacity is contracting significantly for climate-vulnerable regions following several years of elevated catastrophe losses.'}
                        </p>
                        <div className="flex justify-between items-center mt-3">
                          <span className="text-sm text-gray-500">
                            Source: {index === 0 ? 'TNFD' :
                             index === 1 ? 'Climate Home News' :
                             index === 2 ? 'Insurance Business Magazine' :
                             index === 3 ? 'Insurance Journal' :
                             'Insurance Business Magazine'}
                          </span>
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-2">Relevance:</span>
                            <div className="relative w-20 h-2 bg-gray-200 rounded">
                              <div 
                                className="absolute top-0 left-0 h-2 rounded bg-blue-600" 
                                style={{ width: `${(17 - index) / 20 * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm ml-2">{17 - index}/20</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'domains' && (
              <div className="space-y-6">
                {domainRiskScores.map((domain) => (
                  <div key={domain.domain} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">{domain.domain} Insurance</h2>
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
                                  dataKey={domain.domain} 
                                  stroke={
                                    domain.domain === "Property" ? "#FF8042" :
                                    domain.domain === "Casualty" ? "#00C49F" :
                                    domain.domain === "Health" ? "#FFBB28" :
                                    domain.domain === "Life" ? "#0088FE" :
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
                        <h3 className="text-lg font-medium mb-4">Recent Articles Related to {domain.domain} Insurance</h3>
                        <div className="space-y-3">
                          {[...Array(3)].map((_, index) => (
                            <div key={index} className="p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-blue-600">
                                    {domain.domain === "Property" ? 
                                      index === 0 ? "Extreme Weather Driving Property Insurance Market Hardening" :
                                      index === 1 ? "New Study Shows Coastal Flood Risk Underestimated by 30%" :
                                      "Record-breaking hurricane season projected for Atlantic basin" :
                                    domain.domain === "Casualty" ?
                                      index === 0 ? "Climate Liability Claims on the Rise as Legal Precedents Emerge" :
                                      index === 1 ? "Directors and Officers Facing Increased Climate Risk Exposure" :
                                      "Environmental liability claims increasing across multiple sectors" :
                                    domain.domain === "Health" ?
                                      index === 0 ? "Health Insurers Begin Accounting for Climate-Related Illness Trends" :
                                      index === 1 ? "Heat-related illness claims projected to rise with global temperatures" :
                                      "Vector-borne diseases expanding geographic range due to climate change" :
                                    domain.domain === "Life" ?
                                      index === 0 ? "Climate Change Impacts on Mortality Assumptions for Life Insurers" :
                                      index === 1 ? "Life Insurance Portfolios Facing Transition Risks from High-Carbon Assets" :
                                      "Long-term mortality projections adjusted for climate scenarios" :
                                    domain.domain === "Reinsurance" ?
                                      index === 0 ? "Reinsurance Capacity Shrinks for Climate-Vulnerable Regions" :
                                      index === 1 ? "Reinsurance Premiums Increase by 25% in Hurricane-Prone Regions" :
                                      "New parametric risk transfer mechanisms emerging for climate risks" :
                                    ""}
                                  </h4>
                                
                                  <div className="flex items-center mt-1">
                                    <span className="text-xs text-gray-500">
                                      {index === 0 ? "Insurance Journal" :
                                       index === 1 ? "Climate Home News" :
                                       "Insurance Business Magazine"}
                                    </span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <span className="text-xs text-gray-500">
                                      April {10 - index}, 2024
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 ml-4">
                                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                    index === 0 ? 'bg-red-100 text-red-800' :
                                    index === 1 ? 'bg-orange-100 text-orange-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    High Relevance
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

export default InsuranceClimateDashboard;