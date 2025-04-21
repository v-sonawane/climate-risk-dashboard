import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import VectorSearch from './VectorSearch.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm     from 'remark-gfm';
import RiskMap from './RiskMap.jsx';
import UnderwritingCoverageAnalysis from './Underwriting.jsx';
import RegulatoryESGTracker from './RegulatoryESGTracker.jsx';
import ClimateDataManagementPanel from './ClimateDataManagement';
import EnterpriseReportSection from './Reports.jsx';
import PropertyDashboard from './PropertyDashboard.jsx';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';


// COLORS
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const TREND_COLORS = {
  increasing: '#FF4560',
  stable: '#00E396',
  decreasing: '#008FFB'
};
// Updated fetchFrameworksData function with proper error handling


const InsuranceClimateDashboard = () => {
  // Tabs and selection
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedDomain, setSelectedDomain] = useState(null);

  // Data state
  const [domainRiskScores, setDomainRiskScores] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [riskFactors, setRiskFactors] = useState([]);
  const [sourceDistribution, setSourceDistribution] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [reportData, setReportData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Article-detail state
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleSummary, setArticleSummary] = useState("");
  const [frameworks, setFrameworks] = useState([]);
  const [premiumIncrease, setPremiumIncrease] = useState(48);

  // Ref for PDF
  const reportRef = useRef();

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch summary whenever an article is selected
  useEffect(() => {
    if (!selectedArticle) return;
    setArticleSummary("Loading summary…");

    fetch(`${API_BASE_URL}/articles/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_id: selectedArticle.id })
    })
      .then(res => res.json())
      .then(data => setArticleSummary(data.summary))
      .catch(() => setArticleSummary("Failed to load summary."));
  }, [selectedArticle]);
  useEffect(() => {
    // Fetch regulatory frameworks count for the card
    const fetchQuickMetrics = async () => {
      try {
        // Fetch frameworks data
        const frameworksRes = await fetch(`${API_BASE_URL}/regulatory/frameworks`);
        if (frameworksRes.ok) {
          const frameworksData = await frameworksRes.json();
          setFrameworks(frameworksData);
        }
        
        // Fetch premium trends data
        const premiumsRes = await fetch(`${API_BASE_URL}/underwriting/premium-trends`);
        if (premiumsRes.ok) {
          const premiumsData = await premiumsRes.json();
          // Calculate the percentage increase from first to last month
          if (premiumsData.length > 1) {
            const firstMonth = premiumsData[0];
            const lastMonth = premiumsData[premiumsData.length - 1];
            const increase = Math.round(((lastMonth.property / firstMonth.property) - 1) * 100);
            setPremiumIncrease(increase);
          }
        }
      } catch (error) {
        console.error("Error fetching quick metrics:", error);
      }
    };
    
    fetchQuickMetrics();
  }, []);
  const fetchFrameworksData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/regulatory/frameworks`);
      if (!res.ok) throw new Error("Failed to fetch frameworks data");
      const data = await res.json();
      setFrameworks(data);
    } catch (error) {
      console.error("Error fetching frameworks data:", error);
      // Set fallback data
      setFrameworks([
        { id: 1, name: "TCFD", status: "established" },
        { id: 2, name: "TNFD", status: "emerging" },
        { id: 3, name: "EU Taxonomy", status: "established" },
        { id: 4, name: "NAIC Climate Risk Disclosure", status: "emerging" },
        { id: 5, name: "ISSB Standards", status: "proposed" },
        { id: 6, name: "CDSB Framework", status: "established" },
        { id: 7, name: "NGFS Scenarios", status: "emerging" }
      ]);
      // Re-throw the error so the main function knows there was an issue
      throw error;
    }
  };

  // Helper function for fetching premium data
  const fetchPremiumData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/underwriting/premium-trends`);
      if (!res.ok) throw new Error("Failed to fetch premium data");
      
      const data = await res.json();
      if (data.length > 1) {
        // Calculate the percentage increase between first and last data points
        const firstPoint = data[0].property;
        const lastPoint = data[data.length - 1].property;
        const increase = ((lastPoint / firstPoint) - 1) * 100;
        setPremiumIncrease(Math.round(increase));
      }
    } catch (error) {
      console.error("Error fetching premium data:", error);
      // Keep the default fallback value of 48%
      setPremiumIncrease(48);
      // Re-throw the error so the main function knows there was an issue
      throw error;
    }
  };
  // Core data fetch
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 1) Risk scores
      try {
        const res = await fetch(`${API_BASE_URL}/domains/risk-scores`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDomainRiskScores(data);
        generateTrendData(data);
      } catch (error) {
        console.error("Error fetching risk scores:", error);
        // fallback...
        const fallbackData = [
          { domain: "property", risk_score: 8.7, contributing_factors: ["Floods","Wildfires","Hurricanes"], trend: "increasing" },
          { domain: "casualty", risk_score: 6.5, contributing_factors: ["Liability claims","Disclosure failures"], trend: "stable" },
          { domain: "life", risk_score: 4.2, contributing_factors: ["Heat-related illness","Climate mortality"], trend: "stable" },
          { domain: "health", risk_score: 5.8, contributing_factors: ["Vector-borne diseases","Heat stress"], trend: "increasing" },
          { domain: "reinsurance", risk_score: 7.9, contributing_factors: ["Capacity constraints","Pricing increases"], trend: "increasing" },
        ];
        setDomainRiskScores(fallbackData);
        generateTrendData(fallbackData);
      }
  
      // 2) Recent articles
      try {
        const res = await fetch(`${API_BASE_URL}/articles?limit=4&min_relevance=8`);
        if (!res.ok) throw new Error();
        setRecentArticles(await res.json());
      } catch (error) {
        console.error("Error fetching recent articles:", error);
        setRecentArticles([
          { id: "1", title: "TNFD Framework Adoption Accelerating", source: "TNFD", date: "2024-04-15", total_relevance: 17 },
          { id: "2", title: "Extreme Weather Driving Property Insurance Market Hardening", source: "Insurance Journal", date: "2024-04-05", total_relevance: 19 },
          { id: "3", title: "New Study Shows Coastal Flood Risk Underestimated", source: "Climate Home News", date: "2024-03-22", total_relevance: 19 },
          { id: "4", title: "Climate Liability Claims Rising as Legal Precedents Emerge", source: "Insurance Business Magazine", date: "2024-04-01", total_relevance: 15 }
        ]);
      }
  
      // 3) Stats (risk factors & source distribution)
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard/stats`);
        if (!res.ok) throw new Error();
        const stats = await res.json();
        setRiskFactors(
          Object.entries(stats.risk_factor_frequency)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
        );
        setSourceDistribution(
          Object.entries(stats.source_distribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6)
        );
      } catch (error) {
        console.error("Error fetching stats:", error);
        setRiskFactors([
          { name: "Floods", value: 23 },
          { name: "Wildfires", value: 18 },
          { name: "Hurricanes", value: 15 },
          { name: "Regulatory compliance", value: 14 },
          { name: "Liability litigation", value: 12 },
          { name: "Sea level rise", value: 10 },
          { name: "Disclosure requirements", value: 9 },
          { name: "Transition risks", value: 8 }
        ]);
        setSourceDistribution([
          { name: "Insurance Journal", value: 28 },
          { name: "TNFD", value: 23 },
          { name: "Climate Home News", value: 18 },
          { name: "UNFCCC", value: 15 },
          { name: "Insurance Business Magazine", value: 14 },
          { name: "Other", value: 12 }
        ]);
      }
  
      // 4) Latest report
      try {
        const res = await fetch(`${API_BASE_URL}/reports/latest`);
        if (res.ok) {
          setReportData(await res.json());
        } else {
          setReportData({ executive_summary: "No report available yet.", key_developments: "", insurance_domain_impacts: "", recommended_actions: "" });
        }
      } catch (error) {
        console.error("Error fetching report:", error);
        setReportData({ executive_summary: "Error fetching report.", key_developments: "", insurance_domain_impacts: "", recommended_actions: "" });
      }
  
      // 5) Frameworks data
      try {
        await fetchFrameworksData();
      } catch (error) {
        console.error("Error in fetchFrameworksData:", error);
        // Set fallback frameworks data is handled in the fetchFrameworksData function
      }
  
      // 6) Premium data
      try {
        await fetchPremiumData();
      } catch (error) {
        console.error("Error in fetchPremiumData:", error);
        // Set fallback premium increase is handled in the fetchPremiumData function
      }
      
    } catch (mainError) {
      // This catches any errors not caught by the inner try-catch blocks
      console.error("Main error in fetchDashboardData:", mainError);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      // Always set loading to false, regardless of success or failure
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  };

  // Trend chart data
  const generateTrendData = (currentScores) => {
    const months = ['Jan 2024','Feb 2024','Mar 2024','Apr 2024'];
    const trend = months.map((month, idx) => {
      const entry = { month };
      currentScores.forEach(dom => {
        const factor = idx === 3 ? 1 : 0.85 + idx * 0.05;
        entry[dom.domain.charAt(0).toUpperCase() + dom.domain.slice(1)] =
          idx === 3 ? dom.risk_score : +(dom.risk_score * factor).toFixed(1);
      });
      return entry;
    });
    setTrendData(trend);
  };

  // Parse bold markdown and paragraphs to HTML
  const formatMarkdownText = (text) =>
    text
      ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '<br/><br/>')
      : "";

  // PDF download handler
  const downloadReportAsPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    let remainingHeight = imgHeight;
    let posY = margin;
    while (remainingHeight > 0) {
      pdf.addImage(imgData, 'PNG', margin, posY, imgWidth, imgHeight);
      pdf.setDrawColor(200);
      pdf.setLineWidth(1);
      pdf.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin);
      remainingHeight -= (pageHeight - margin * 2);
      if (remainingHeight > 0) {
        pdf.addPage();
        posY = -(imgHeight - (pageHeight - margin * 2) * Math.floor(imgHeight / (pageHeight - margin * 2)));
      }
    }
    pdf.save('Climate_Risk_Report.pdf');
  };

  // Parse domain report into parts
  const formatDomainReport = (text) => {
    if (!text) return {};
    const clean = text.replace(/\*\*/g, '');
    const domains = ['property','casualty','health','life','reinsurance'];
    return domains.reduce((acc, d) => {
      const re = new RegExp(`${d}:([\\s\\S]*?)(?=\\n\\n|$)`, 'i');
      const m = clean.match(re);
      acc[d] = m ? m[1].trim() : '';
      return acc;
    }, {});
  };
  const domainReports = formatDomainReport(reportData.insurance_domain_impacts);
  const activeDomains = Object.entries(domainReports).filter(([, txt]) => txt);

  // Handle clicks on domains
  const handleDomainSelect = (d) => setSelectedDomain(d === selectedDomain ? null : d);

  // Run a new analysis
  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/analysis/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_full_pipeline: true })
      });
      if (!res.ok) throw new Error();
      alert('Analysis started; please wait a few minutes.');
    } catch (e) {
      alert('Error starting analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  //
  // —— RENDERING —— 
  //

  // 1️⃣ Article Detail view
  if (activeTab === 'articleDetail' && selectedArticle) {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <button
          className="text-blue-600 hover:underline mb-6"
          onClick={() => {
            setSelectedArticle(null);
            setActiveTab('articles');
          }}
        >
          ← Back to Articles
        </button>
  
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 text-white p-6">
            <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
            <p className="text-sm opacity-75 mt-1">
              {selectedArticle.source} • {selectedArticle.date}
            </p>
          </div>
          
          {/* Summary */}
          <div className="prose prose-lg p-6">
            {articleSummary ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {articleSummary}
              </ReactMarkdown>
            ) : (
              <p className="italic">Loading summary…</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2️⃣ Main dashboard & tabs
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-indigo-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">PoliSure</h1>
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
      </header>

      {/* Tabs */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 flex space-x-4">
        {['dashboard','reports','articles','domains','search','map','regulatory','underwriting','data-management','property'].map(tab => (
  <button
    key={tab}
    className={`px-4 py-3 font-medium whitespace-nowrap ${
      activeTab === tab
        ? 'text-blue-600 border-b-2 border-blue-600'
        : 'text-gray-600 hover:text-blue-500'
    }`}
    onClick={() => setActiveTab(tab)}
  >
    {tab === 'search' ? 'Semantic Search' : 
     tab === 'map' ? 'Risk Map' : 
     tab === 'regulatory' ? 'Regulatory & ESG' : 
     tab === 'underwriting' ? 'Underwriting & Coverage' : 
     tab === 'data-management' ? 'AI Data Manager' :
     tab === 'property' ? 'Property Dashboard' :
     tab.charAt(0).toUpperCase() + tab.slice(1)}
  </button>
))}

        </div>
      </nav>

      {/* Content */}
      <main className="flex-grow container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
            <h3 className="text-lg font-medium">Error loading data</h3>
            <p>{error}</p>
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
              <>
                {/* Risk Scores */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Current Risk Scores by Domain</h2>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {domainRiskScores.map(dom => (
                      <div
                        key={dom.domain}
                        className={`p-4 rounded-lg cursor-pointer transition-all ${
                          selectedDomain === dom.domain
                            ? 'bg-blue-100 border border-blue-300'
                            : 'bg-white border border-gray-200 hover:bg-blue-50'
                        }`}
                        onClick={() => handleDomainSelect(dom.domain)}
                      >
                        <div className="flex justify-between mb-2">
                          <h3 className="font-medium capitalize">{dom.domain}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              dom.trend === 'increasing'
                                ? 'bg-red-100 text-red-800'
                                : dom.trend === 'decreasing'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {dom.trend === 'increasing'
                              ? '↑'
                              : dom.trend === 'decreasing'
                              ? '↓'
                              : '→'}{' '}
                            {dom.trend}
                          </span>
                        </div>
                        <div className="relative pt-1 mb-2">
                          <div className="overflow-hidden h-2 rounded bg-gray-200">
                            <div
                              style={{ width: `${(dom.risk_score / 10) * 100}%` }}
                              className={`h-2 rounded ${
                                dom.risk_score >= 7.5
                                  ? 'bg-red-500'
                                  : dom.risk_score >= 5
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Risk Level</span>
                          <span className="font-semibold">{dom.risk_score.toFixed(1)}/10</span>
                        </div>

                        {selectedDomain === dom.domain && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-1">Key Risk Factors:</p>
                            <ul className="text-sm text-gray-600 list-disc list-inside">
                              {dom.contributing_factors.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Top Risk Factors */}
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

                  {/* Source Distribution */}
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
                            label={({ name, percent }) =>
                              `${name} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={80}
                            dataKey="value"
                          >
                            {sourceDistribution.map((_, idx) => (
                              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Trend */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Risk Score Trends (Last 4 Months)
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        {['Property','Casualty','Health','Life','Reinsurance'].map((key, i) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer" 
                      onClick={() => setActiveTab('regulatory')}>
                    <h3 className="text-lg font-semibold mb-2">Regulatory & ESG Intelligence</h3>
                    <p className="text-gray-600 mb-3">
                      Monitor regulatory frameworks, ESG impacts, and compliance requirements affecting insurance business lines.
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        {frameworks ? frameworks.length : '7'} Frameworks
                      </div>
                      <span className="text-blue-600 text-sm">View details →</span>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setActiveTab('underwriting')}>
                    <h3 className="text-lg font-semibold mb-2">Underwriting & Coverage Analysis</h3>
                    <p className="text-gray-600 mb-3">
                      Analyze premium trends, coverage gaps, and underwriting challenges related to climate risks.
                    </p>
                    <div className="flex justify-between items-center">
                      <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                        Property Premiums +{premiumIncrease || '48'}%
                      </div>
                      <span className="text-blue-600 text-sm">View details →</span>
                    </div>
                  </div>
                </div>

                {/* Recent Articles */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Recent High‑Impact Articles</h2>
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Relevance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentArticles.map((article, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedArticle(article);
                              setActiveTab('articleDetail');
                            }}
                          >
                            <td className="px-6 py-4 text-sm font-medium text-blue-600">
                              {article.title}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {article.source}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {article.date}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <span className="mr-2">
                                  {article.total_relevance?.toFixed(1) || 'N/A'}
                                </span>
                                <div className="w-24 h-2 bg-gray-200 rounded relative">
                                  <div
                                    className="absolute top-0 left-0 h-2 rounded bg-blue-600"
                                    style={{
                                      width: `${(article.total_relevance || 0) / 20 * 100}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
            {activeTab === 'data-management' && (
  <div className="bg-white rounded-lg shadow">
    <ClimateDataManagementPanel />
  </div>
)}
            {activeTab === 'reports' && (
  <div className="bg-white rounded-lg shadow">
    <EnterpriseReportSection />
  </div>
)}
          {activeTab === 'regulatory' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">Regulatory & ESG Intelligence</h2>
              <RegulatoryESGTracker />
            </div>
          )}

          {activeTab === 'underwriting' && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">Underwriting Challenges & Coverage Analysis</h2>
              <UnderwritingCoverageAnalysis />
            </div>
            )}

            {activeTab === 'articles' && (
              <ArticlesTab
                apiBaseUrl={API_BASE_URL}
                onArticleClick={(a) => {
                  setSelectedArticle(a);
                  setActiveTab('articleDetail');
                }}
              />
            )}

            {activeTab === 'domains' && (
              <div className="space-y-6">
                {domainRiskScores.map(dom => (
                  <DomainSection
                    key={dom.domain}
                    domain={dom}
                    trendData={trendData}
                    apiBaseUrl={API_BASE_URL}
                  />
                ))}
              </div>
            )}

            {activeTab === 'search' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Semantic Search & Topic Analysis
                </h2>
                <VectorSearch />
              </div>
            )}
            {activeTab === 'map' && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Live Risk Map</h2>
                <RiskMap />
              </div>
            )}
            {activeTab === 'property' && (
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-semibold mb-4">Property Dashboard</h2>
                <PropertyDashboard />
              </div>
            )}
          

          </>
        )}

      </main>

      <footer className="bg-gray-800 text-white py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <p className="text-sm">© 2025 Polisure Platform</p>
          <div className="flex space-x-4">
            <a href="#" className="text-sm text-gray-300 hover:text-white">Terms</a>
            <a href="#" className="text-sm text-gray-300 hover:text-white">Privacy</a>
            <a href="#" className="text-sm text-gray-300 hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

// —— ArticlesTab Component —— 
const ArticlesTab = ({ apiBaseUrl, onArticleClick }) => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ source: '', domain: '', searchTerm: '' });

  const perPage = 10;

  useEffect(() => {
    fetchArticles();
  }, [page, filters]);

  const fetchArticles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `${apiBaseUrl}/articles?skip=${page * perPage}&limit=${perPage}`;
      if (filters.source) url += `&source=${encodeURIComponent(filters.source)}`;
      if (filters.domain) url += `&domain=${encodeURIComponent(filters.domain)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      setArticles(await res.json());
    } catch {
      setError("Failed to load. Showing mock data.");
      setArticles([
        {
          id: "mock1",
          title: "TNFD Framework Adoption Accelerating Among Insurers",
          source: "TNFD",
          source_type: "regulatory",
          date: "2024-04-15",
          content:
            "Major financial institutions have begun reporting against the TNFD framework...",
          total_relevance: 17.5
        },
        // ... more mock items
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(0);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Climate Risk Articles</h2>
        <form className="mt-4 flex flex-col md:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
          <input
            type="text"
            name="searchTerm"
            placeholder="Search articles..."
            className="flex-grow px-4 py-2 border rounded-md focus:ring-blue-500"
            value={filters.searchTerm}
            onChange={handleFilterChange}
          />
          <select
            name="source"
            className="px-4 py-2 border rounded-md focus:ring-blue-500"
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
            name="domain"
            className="px-4 py-2 border rounded-md focus:ring-blue-500"
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
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={() => fetchArticles()}
          >
            Filter
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="p-4 text-red-600">{error}</div>
      ) : (
        <div className="p-4 space-y-4">
          {articles.map((art, idx) => (
            <div
              key={idx}
              className="border p-4 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={() => onArticleClick(art)}
            >
              <div className="flex justify-between">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    art.source_type === 'regulatory'
                      ? 'bg-blue-100 text-blue-800'
                      : art.source_type === 'industry'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {art.source_type || 'News'}
                </span>
                <span className="text-sm text-gray-500">{art.date}</span>
              </div>
              <h3 className="text-lg font-medium text-blue-600 mt-2">{art.title}</h3>
              <p className="text-gray-600 mt-2 line-clamp-2">
                {art.content
                  ? art.content.length > 200
                    ? art.content.slice(0, 200) + '...'
                    : art.content
                  : ''}
              </p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-gray-500">Source: {art.source}</span>
                <div className="flex items-center">
                  <span className="text-sm font-medium mr-2">Relevance:</span>
                  <div className="relative w-20 h-2 bg-gray-200 rounded">
                    <div
                      className="absolute top-0 left-0 h-2 rounded bg-blue-600"
                      style={{
                        width: `${(art.total_relevance || 0) / 20 * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-sm ml-2">
                    {art.total_relevance?.toFixed(1) || 'N/A'}/20
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && articles.length > 0 && (
        <div className="flex justify-between items-center p-4 border-t">
          <span className="text-sm text-gray-500">
            Showing {page * perPage + 1}–{page * perPage + articles.length}
          </span>
          <div className="flex">
            <button
              className="px-3 py-1 border rounded-l-md hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </button>
            <span className="px-4 py-1 border-t border-b">{page + 1}</span>
            <button
              className="px-3 py-1 border rounded-r-md hover:bg-gray-100 disabled:opacity-50"
              onClick={() => setPage(page + 1)}
              disabled={articles.length < perPage}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// —— DomainSection Component —— 
const DomainSection = ({ domain, trendData, apiBaseUrl }) => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomainArticles();
  }, [domain]);

  const fetchDomainArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${apiBaseUrl}/structured-summaries?domain=${domain.domain}&limit=3`
      );
      if (!res.ok) throw new Error();
      setArticles(await res.json());
    } catch {
      // fallback sample
      setArticles([
        {
          key_event: `Sample event for ${domain.domain}`,
          source: "Insurance Journal",
          date: "2024-04-10",
          confidence: "High"
        },
        // … more mock …
      ]);
    }
    setLoading(false);
  };

  return (
    
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold capitalize">{domain.domain} Insurance</h2>
        <div className="flex items-center">
          <span className="text-sm mr-2">Risk Score:</span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              domain.risk_score >= 7.5
                ? 'bg-red-100 text-red-800'
                : domain.risk_score >= 5
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}
          >
            {domain.risk_score.toFixed(1)}/10
          </span>
          <span
            className={`ml-2 inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
              domain.trend === 'increasing'
                ? 'bg-red-100 text-red-800'
                : domain.trend === 'decreasing'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {domain.trend === 'increasing'
              ? '↑'
              : domain.trend === 'decreasing'
              ? '↓'
              : '→'}{' '}
            {domain.trend}
          </span>
        </div>
      </div><div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
  
      <div className="p-6">
        {/* key factors, business implications, trend chart, related regs omitted for brevity */}
        <div className="mt-8 border-t pt-6">
          <h3 className="text-lg font-medium mb-4">
            Recent Articles Related to {domain.domain.charAt(0).toUpperCase() + domain.domain.slice(1)}
          </h3>
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map((art, i) => (
                <div key={i} className="p-3 border rounded-md hover:bg-gray-50">
                  <h4 className="font-medium text-blue-600">
                    {art.key_event}
                  </h4>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span>{art.source}</span>
                    <span className="mx-2">•</span>
                    <span>{art.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div></div>
  );
};

export default InsuranceClimateDashboard;
