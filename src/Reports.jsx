import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, Share2, AlertCircle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// API base URL - change this to match your backend URL
const API_BASE_URL = 'http://localhost:8000';

const EnterpriseReportSection = () => {
  // State
  const [reports, setReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleSection, setVisibleSection] = useState('all');

  // Ref for PDF generation
  const reportRef = useRef();

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Fetch reports from the backend
  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching reports from", `${API_BASE_URL}/reports`);
      const response = await fetch(`${API_BASE_URL}/reports`);
      
      console.log("Reports response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Successfully fetched reports:", data);
      
      setReports(data);
      
      // Set the most recent report as current
      if (data && data.length > 0) {
        setCurrentReport(data[0]);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch a specific report by ID
  const fetchReportById = async (reportId) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`Fetching report with ID: ${reportId}`);
      const response = await fetch(`${API_BASE_URL}/reports/${reportId}`);
      
      console.log("Report response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Successfully fetched report:", data);
      
      setCurrentReport(data);
    } catch (err) {
      console.error(`Error fetching report ${reportId}:`, err);
      setError(`Failed to load report. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch the latest report
  const fetchLatestReport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("Fetching latest report");
      const response = await fetch(`${API_BASE_URL}/reports/latest`);
      
      console.log("Latest report response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch latest report: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Successfully fetched latest report:", data);
      
      setCurrentReport(data);
    } catch (err) {
      console.error("Error fetching latest report:", err);
      setError(`Failed to load the latest report. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a PDF from the report
  const downloadReportAsPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      // Create a loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
      loadingDiv.innerHTML = '<div class="bg-white p-4 rounded-lg shadow-lg"><p class="text-lg font-medium">Generating PDF...</p></div>';
      document.body.appendChild(loadingDiv);
      
      // Wait a moment to ensure the loading indicator is visible
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create PDF
      const canvas = await html2canvas(reportRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
      
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
      
      // Add metadata
      if (currentReport) {
        pdf.setProperties({
          title: `Climate Risk Report - ${new Date().toLocaleDateString()}`,
          subject: 'Climate Risk Intelligence',
          author: 'Climate Risk Intelligence Platform',
          keywords: 'climate risk, insurance, intelligence',
          creator: 'Climate Risk Intelligence Platform'
        });
      }
      
      // Save the PDF
      pdf.save('Climate_Risk_Report.pdf');
      
      // Remove loading indicator
      document.body.removeChild(loadingDiv);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // Share the report (example implementation)
  const shareReport = () => {
    // In a real implementation, this might open a modal with sharing options
    // For now, we'll just copy a link to the clipboard
    if (currentReport && currentReport.id) {
      const reportLink = `${window.location.origin}/reports/${currentReport.id}`;
      navigator.clipboard.writeText(reportLink)
        .then(() => alert('Report link copied to clipboard!'))
        .catch(err => console.error('Could not copy link: ', err));
    } else {
      alert('No report selected to share');
    }
  };

  // Trigger a new report generation
  const generateNewReport = async () => {
    if (window.confirm('Generate a new climate risk report? This may take a few minutes.')) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/analysis/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ run_full_pipeline: true })
        });
        
        if (!response.ok) {
          throw new Error(`Failed to start analysis: ${response.status}`);
        }
        
        const data = await response.json();
        alert(`Analysis started with task ID: ${data.task_id}. This may take several minutes to complete.`);
        
        // Set a timer to check for the new report after a delay
        setTimeout(() => {
          fetchLatestReport();
        }, 10000); // Check after 10 seconds initially
        
      } catch (err) {
        console.error("Error starting analysis:", err);
        setError(`Failed to start analysis. ${err.message}`);
        setIsLoading(false);
      }
    }
  };

  // Format report date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Check if the report is ready
  const checkReportStatus = async (taskId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/task/${taskId}`);
      if (!response.ok) {
        throw new Error(`Failed to check task status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        // Task is done, fetch the latest report
        fetchLatestReport();
      } else if (data.status === 'failed') {
        setError(`Report generation failed: ${data.error || 'Unknown error'}`);
        setIsLoading(false);
      } else {
        // Task is still running, check again after a delay
        setTimeout(() => checkReportStatus(taskId), 5000); // Check every 5 seconds
      }
    } catch (err) {
      console.error("Error checking task status:", err);
      setError(`Failed to check task status. ${err.message}`);
      setIsLoading(false);
    }
  };

  // Handle report selection
  const handleReportSelect = (report) => {
    setCurrentReport(report);
  };

  // Toggle section visibility
  const toggleSection = (section) => {
    setVisibleSection(visibleSection === section ? 'all' : section);
  };

  // Format sections for display
  const formatSection = (content) => {
    if (!content) return 'No data available';
    
    // Check if content is already properly formatted
    if (content.includes('\n') || content.includes('**')) {
      return content;
    }
    
    // Basic formatting for plain text
    return content.replace(/\. /g, '.\n\n');
  };

  // Render loading state
  if (isLoading && !currentReport) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render error state
  if (error && !currentReport) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-start">
        <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
        <div>
          <p className="font-medium">Error loading reports</p>
          <p className="mt-1">{error}</p>
          <button
            onClick={fetchReports}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        {/* Header and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">
            Climate Risk Intelligence Report
          </h1>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateNewReport}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Generate New Report
            </button>
            
            <button
              onClick={downloadReportAsPDF}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={!currentReport}
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
            
            <button
              onClick={shareReport}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              disabled={!currentReport}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share Report
            </button>
          </div>
        </div>
        
        {/* Report Selection */}
        {reports.length > 1 && (
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-3">Available Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    currentReport && currentReport.id === report.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => handleReportSelect(report)}
                >
                  <div className="flex items-start">
                    <FileText className="h-5 w-5 mr-2 text-blue-500" />
                    <div>
                      <h3 className="font-medium">
                        Report {formatDate(report.generated_date)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {report.article_count} articles
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main Report Content */}
        {currentReport ? (
          <div
            ref={reportRef}
            className="bg-white p-8 border border-gray-300 rounded-lg mx-auto"
            style={{ maxWidth: '900px' }}
          >
            {/* Report Header */}
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">
                Climate Risk Intelligence Report
              </h2>
              <p className="text-gray-600">
                Generated on {formatDate(currentReport.generated_date)}
              </p>
              <p className="text-sm text-gray-500">
                Based on {currentReport.article_count} articles from {currentReport.sources?.join(', ')}
              </p>
            </div>
            
            {/* Executive Summary */}
            <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'executive_summary' ? 'hidden' : ''}`}>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => toggleSection('executive_summary')}
              >
                <h3 className="text-xl font-semibold mb-3">Executive Summary</h3>
                <span className="ml-2 text-gray-500 text-sm">
                  {visibleSection === 'executive_summary' ? '(click to show all)' : ''}
                </span>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>
                  {formatSection(currentReport.executive_summary)}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Key Climate Risk Developments */}
            <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'key_developments' ? 'hidden' : ''}`}>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => toggleSection('key_developments')}
              >
                <h3 className="text-xl font-semibold mb-3">Key Climate Risk Developments</h3>
                <span className="ml-2 text-gray-500 text-sm">
                  {visibleSection === 'key_developments' ? '(click to show all)' : ''}
                </span>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>
                  {formatSection(currentReport.key_developments)}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Insurance Domain Impacts */}
            <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'domain_impacts' ? 'hidden' : ''}`}>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => toggleSection('domain_impacts')}
              >
                <h3 className="text-xl font-semibold mb-3">Insurance Domain Impacts</h3>
                <span className="ml-2 text-gray-500 text-sm">
                  {visibleSection === 'domain_impacts' ? '(click to show all)' : ''}
                </span>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>
                  {formatSection(currentReport.insurance_domain_impacts)}
                </ReactMarkdown>
              </div>
            </div>
            
            {/* Regional Insights - Only if available */}
            {currentReport.regional_insights && (
              <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'regional_insights' ? 'hidden' : ''}`}>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSection('regional_insights')}
                >
                  <h3 className="text-xl font-semibold mb-3">Regional Insights</h3>
                  <span className="ml-2 text-gray-500 text-sm">
                    {visibleSection === 'regional_insights' ? '(click to show all)' : ''}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown>
                    {formatSection(currentReport.regional_insights)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Regulatory Landscape - Only if available */}
            {currentReport.regulatory_landscape && (
              <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'regulatory_landscape' ? 'hidden' : ''}`}>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSection('regulatory_landscape')}
                >
                  <h3 className="text-xl font-semibold mb-3">Regulatory Landscape</h3>
                  <span className="ml-2 text-gray-500 text-sm">
                    {visibleSection === 'regulatory_landscape' ? '(click to show all)' : ''}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown>
                    {formatSection(currentReport.regulatory_landscape)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Business Implications - Only if available */}
            {currentReport.business_implications && (
              <div className={`mb-8 ${visibleSection !== 'all' && visibleSection !== 'business_implications' ? 'hidden' : ''}`}>
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => toggleSection('business_implications')}
                >
                  <h3 className="text-xl font-semibold mb-3">Business Implications</h3>
                  <span className="ml-2 text-gray-500 text-sm">
                    {visibleSection === 'business_implications' ? '(click to show all)' : ''}
                  </span>
                </div>
                <div className="prose max-w-none">
                  <ReactMarkdown>
                    {formatSection(currentReport.business_implications)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            
            {/* Recommended Actions */}
            <div className={`${visibleSection !== 'all' && visibleSection !== 'recommended_actions' ? 'hidden' : ''}`}>
              <div
                className="flex items-center cursor-pointer"
                onClick={() => toggleSection('recommended_actions')}
              >
                <h3 className="text-xl font-semibold mb-3">Recommended Actions</h3>
                <span className="ml-2 text-gray-500 text-sm">
                  {visibleSection === 'recommended_actions' ? '(click to show all)' : ''}
                </span>
              </div>
              <div className="prose max-w-none">
                <ReactMarkdown>
                  {formatSection(currentReport.recommended_actions)}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No report available</h3>
            <p className="text-gray-500 mt-2">Generate a new report to get started</p>
            <button
              onClick={generateNewReport}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Generate Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseReportSection;