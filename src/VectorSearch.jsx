import React, { useState, useEffect } from 'react';
import { Search, Bookmark, AlertTriangle, TrendingUp, PieChart, Activity } from 'lucide-react';

const VectorSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [activeTab, setActiveTab] = useState('search');
  const [topicClusters, setTopicClusters] = useState([]);
  const [isClusterLoading, setIsClusterLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = 'http://localhost:8000';

  // Available domains for filtering
  const domains = [
    { id: 'property', name: 'Property' },
    { id: 'casualty', name: 'Casualty' },
    { id: 'life', name: 'Life' },
    { id: 'health', name: 'Health' },
    { id: 'reinsurance', name: 'Reinsurance' }
  ];

  // Toggle domain selection
  const toggleDomain = (domainId) => {
    if (selectedDomains.includes(domainId)) {
      setSelectedDomains(selectedDomains.filter(id => id !== domainId));
    } else {
      setSelectedDomains([...selectedDomains, domainId]);
    }
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/search/vector`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10,
          domains: selectedDomains.length > 0 ? selectedDomains : null,
          min_relevance: 0
        }),
      });
      
      if (!response.ok) throw new Error('Search request failed');
      
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch topic clusters
  const fetchTopicClusters = async () => {
    setIsClusterLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/topics/clusters?num_clusters=5`);
      
      if (!response.ok) throw new Error('Failed to fetch topic clusters');
      
      const data = await response.json();
      setTopicClusters(data);
    } catch (err) {
      setError(err.message);
      setTopicClusters([]);
    } finally {
      setIsClusterLoading(false);
    }
  };

  // Load topic clusters when switching to that tab
  useEffect(() => {
    if (activeTab === 'topics' && topicClusters.length === 0) {
      fetchTopicClusters();
    }
  }, [activeTab]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b">
        <div className="flex">
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'search' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('search')}
          >
            <div className="flex items-center">
              <Search className="w-4 h-4 mr-2" />
              Vector Search
            </div>
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'topics' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('topics')}
          >
            <div className="flex items-center">
              <PieChart className="w-4 h-4 mr-2" />
              Topic Clusters
            </div>
          </button>
          <button
            className={`px-4 py-3 font-medium ${activeTab === 'trends' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:text-blue-500'}`}
            onClick={() => setActiveTab('trends')}
          >
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" />
              Emerging Trends
            </div>
          </button>
        </div>
      </div>

      <div className="p-4">
        {activeTab === 'search' && (
          <div>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex flex-col space-y-4">
                <div>
                  <label htmlFor="search-query" className="block text-sm font-medium text-gray-700 mb-1">
                    Search Query
                  </label>
                  <div className="flex">
                    <input
                      id="search-query"
                      type="text"
                      className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your semantic search query..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 flex items-center"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Searching...' : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Insurance Domain
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {domains.map((domain) => (
                      <button
                        key={domain.id}
                        type="button"
                        className={`px-3 py-1 text-sm rounded-full ${
                          selectedDomains.includes(domain.id)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                        }`}
                        onClick={() => toggleDomain(domain.id)}
                      >
                        {domain.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </form>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Search Results</h3>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((article, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                          {article.source}
                        </span>
                        <span className="text-sm text-gray-500">{article.date}</span>
                      </div>
                      <h4 className="text-lg font-medium text-blue-600 mt-2">
                        {article.title}
                      </h4>
                      <p className="text-gray-600 mt-2 line-clamp-2">
                        {article.content && article.content.length > 200 
                          ? article.content.substring(0, 200) + '...' 
                          : article.content}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center">
                          <span className="text-sm font-medium mr-2">Relevance:</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600" 
                              style={{width: `${(article.total_relevance || 0) * 5}%`}}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm">{article.total_relevance?.toFixed(1) || 0}</span>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800">
                          <Bookmark className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No results found. Try a different search query.' : 'Enter a search query to find relevant articles.'}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'topics' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Topic Clusters</h3>
              <button 
                onClick={fetchTopicClusters}
                className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
                disabled={isClusterLoading}
              >
                {isClusterLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start">
                <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isClusterLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : topicClusters.length > 0 ? (
              <div className="space-y-6">
                {topicClusters.map((cluster) => (
                  <div key={cluster.cluster_id} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-800">{cluster.label}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {cluster.summary_count} articles
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cluster.domains.map((domain, i) => (
                          <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                            {domain}
                          </span>
                        ))}
                        {cluster.risk_factors.slice(0, 3).map((factor, i) => (
                          <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            {factor}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Representative Summaries</h5>
                      <div className="space-y-3">
                        {cluster.representative_summaries.slice(0, 3).map((summary, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-md">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium text-blue-600">{summary.key_event}</span>
                              <span className="text-xs text-gray-500">{summary.source}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {summary.business_implications}
                            </p>
                          </div>
                        ))}
                      </div>
                      {cluster.representative_summaries.length > 3 && (
                        <div className="mt-2 text-right">
                          <button className="text-sm text-blue-600 hover:text-blue-800">
                            View {cluster.representative_summaries.length - 3} more
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No topic clusters available. Try refreshing or adding more articles to the database.
              </div>
            )}
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="py-8 text-center">
            <div className="inline-flex items-center justify-center p-4 bg-blue-50 rounded-full mb-4">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium">Emerging Trends Analysis</h3>
            <p className="mt-2 text-gray-600">This feature is coming soon. It will provide AI-powered emerging trend detection using vector embeddings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VectorSearch;