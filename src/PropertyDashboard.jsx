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
            onClick={() => generatePropertyValuation(selectedProperty)}
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
          onClick={generatePortfolioRecommendations}
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
          <h3 className="text-lg font-bold mb-4">Portfolio Optimization Recommendations</h3>
          
          <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h4 className="font-medium mb-2">AI Portfolio Analysis</h4>
            <p className="text-gray-700">{portfolioRecommendations[0].portfolioAnalysis}</p>
          </div>
          
          <div className="space-y-4">
            {portfolioRecommendations.map((rec, index) => (
              <div key={index} className="border rounded p-4 hover:bg-gray-50">
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full mr-2 ${rec.type === 'divest' ? 'bg-red-100 text-red-600' : rec.type === 'invest' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {rec.type === 'divest' ? '−' : rec.type === 'invest' ? '+' : '⚙'}
                  </span>
                  <h4 className="font-bold">{rec.title}</h4>
                </div>
                <p className="text-gray-700 mb-2">{rec.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">Risk Impact: </span>
                  {rec.riskImpact}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <span className="font-medium">Financial Impact: </span>
                  {rec.financialImpact}
                </div>
                {rec.propertyIds && rec.propertyIds.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">Related Properties: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {rec.propertyIds.map(propId => {
                        const property = properties.find(p => p.id === propId);
                        return property ? (
                          <span key={propId} className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {property.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* AI Premium Optimization View */}
  {activeView === 'premium' && (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <DollarSign className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold">AI Premium Optimization</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Get AI-powered insurance premium recommendations based on property risk profiles.
          Select a property to analyze optimal premium pricing.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Property for Premium Analysis</label>
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
            onClick={() => generatePremiumRecommendation(selectedProperty)}
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Standard Premium</h4>
              <p className="text-2xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].standardPremium.toLocaleString()}/year</p>
              <p className="text-sm text-gray-600 mt-1">Market average premium without risk adjustment</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Risk-Adjusted Premium</h4>
              <p className="text-2xl font-bold text-blue-600">${premiumRecommendations[selectedProperty].recommendedPremium.toLocaleString()}/year</p>
              <p className="text-sm text-gray-600 mt-1">
                AI-recommended premium based on risk profile
              </p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Premium Difference</h4>
              <p className={`text-2xl font-bold ${premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? 'text-red-600' : 'text-green-600'}`}>
                {premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? '+' : ''}
                ${(premiumRecommendations[selectedProperty].recommendedPremium - premiumRecommendations[selectedProperty].standardPremium).toLocaleString()}/year
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {Math.abs(((premiumRecommendations[selectedProperty].recommendedPremium / premiumRecommendations[selectedProperty].standardPremium) - 1) * 100).toFixed(1)}% {premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? 'increase' : 'decrease'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Risk Factors Affecting Premium</h4>
              <ul className="space-y-2">
                {premiumRecommendations[selectedProperty].riskFactors.map((factor, index) => (
                  <li key={index} className="flex items-start">
                    <span className={`inline-block w-5 text-center ${factor.impact > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {factor.impact > 0 ? '↑' : '↓'}
                    </span>
                    <span className="ml-2">{factor.name} <span className="text-gray-500">({factor.impact > 0 ? '+' : ''}{factor.impact}%)</span></span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Coverage Recommendations</h4>
              <ul className="space-y-2">
                {premiumRecommendations[selectedProperty].coverageRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-5 text-center text-blue-500">•</span>
                    <span className="ml-2">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h4 className="font-medium mb-2">AI Premium Analysis</h4>
            <p className="text-gray-700">{premiumRecommendations[selectedProperty].analysis}</p>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Deductible Recommendation</h4>
              <p className="text-xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].deductibleRecommendation.toLocaleString()}</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Coverage Limit</h4>
              <p className="text-xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].coverageLimit.toLocaleString()}</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Risk Score</h4>
              <p className={`text-xl font-bold ${
                premiumRecommendations[selectedProperty].riskScore > 7 ? 'text-red-600' : 
                premiumRecommendations[selectedProperty].riskScore > 4 ? 'text-amber-600' : 
                'text-green-600'
              }`}>
                {premiumRecommendations[selectedProperty].riskScore}/10
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
);

// Function to generate AI-powered property valuation
async function generatePropertyValuation(propertyId) {
if (!propertyId) return;

setAiAnalysisLoading(true);

try {
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    throw new Error("Property not found");
  }
  
  // In a real application, you would call your backend API here
  // For demonstration, we're simulating an LLM call with a timeout
  
  console.log(`Generating AI valuation for property: ${property.name}`);
  
  // Simulate API call to LLM service
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulating LLM response
  // In a real application, you would send property details to your backend,
  // which would then use the LLM to generate a valuation analysis
  
  const baseValue = Math.floor(Math.random() * 500000) + 500000;
  const riskFactor = Math.random() * 0.3 - 0.15; // Between -15% and +15%
  const adjustedValue = Math.round(baseValue * (1 + riskFactor));
  
  const factorCount = Math.floor(Math.random() * 3) + 3; // 3-5 factors
  const factors = [];
  
  // Risk factors affecting valuation
  const possibleFactors = [
    { description: "Flood risk in the area", impact: -5.2 },
    { description: "Wildfire vulnerability", impact: -7.8 },
    { description: "Hurricane exposure", impact: -4.6 },
    { description: "Storm surge potential", impact: -6.1 },
    { description: "Drought conditions", impact: -3.2 },
    { description: "Recent climate resilience improvements", impact: 4.3 },
    { description: "Property elevation advantage", impact: 3.7 },
    { description: "Modern construction resilience features", impact: 5.1 },
    { description: "Proximity to high-risk zones", impact: -3.9 },
    { description: "Historical weather patterns", impact: 2.8 }
  ];
  
  // Select random factors
  const selectedFactors = [];
  while (selectedFactors.length < factorCount) {
    const randomIndex = Math.floor(Math.random() * possibleFactors.length);
    if (!selectedFactors.includes(randomIndex)) {
      selectedFactors.push(randomIndex);
      factors.push(possibleFactors[randomIndex]);
    }
  }
  
  // Generate analysis text
  const analysis = `Based on climate risk assessment of ${property.name} located at ${property.address}, this property shows ${riskFactor >= 0 ? 'positive resilience factors that slightly increase' : 'vulnerability to several climate hazards that decrease'} its market value by approximately ${Math.abs(riskFactor * 100).toFixed(1)}%. The primary factors affecting valuation are related to ${factors.map(f => f.description.toLowerCase().replace(' in the area', '')).join(', ')}. Long-term climate projections suggest that these risk factors may ${riskFactor >= 0 ? 'continue to positively impact' : 'further negatively affect'} property values in this region over the next decade.`;
  
  // Store the valuation data
  setPropertyValuations(prev => ({
    ...prev,
    [propertyId]: {
      baselineValue: baseValue,
      adjustedValue: adjustedValue,
      factors: factors,
      analysis: analysis
    }
  }));
  
} catch (error) {
  console.error("Error generating property valuation:", error);
  // Show error message to user
} finally {
  setAiAnalysisLoading(false);
}
}

// Function to generate AI-powered portfolio recommendations
async function generatePortfolioRecommendations() {
setAiAnalysisLoading(true);

try {
  if (properties.length === 0) {
    throw new Error("No properties in portfolio");
  }
  
  console.log("Generating AI portfolio recommendations");
  
  // Simulate API call to LLM service
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Simulating LLM response
  // In a real application, you would send portfolio details to your backend,
  // which would then use the LLM to generate recommendations
  
  // Select a subset of properties for recommendations
  const propertyCount = Math.min(properties.length, 3);
  const selectedProperties = [];
  const selectedPropertyIds = [];
  
  while (selectedProperties.length < propertyCount) {
    const randomIndex = Math.floor(Math.random() * properties.length);
    const property = properties[randomIndex];
    
    if (!selectedProperties.includes(property)) {
      selectedProperties.push(property);
      selectedPropertyIds.push(property.id);
    }
  }
  
  // Generate portfolio analysis
  const portfolioAnalysis = `Your portfolio of ${properties.length} properties shows a ${Math.random() > 0.5 ? 'moderate' : 'significant'} concentration of climate risk, with ${Math.floor(properties.length * 0.4)} properties exposed to high flood risk and ${Math.floor(properties.length * 0.3)} properties in areas with increasing wildfire risk. The geographic distribution indicates overexposure in coastal regions. We recommend balancing your portfolio by divesting from some high-risk coastal properties and investing in areas with lower climate risk profiles, such as inland properties at higher elevations.`;
  
  // Generate specific recommendations
  const recommendations = [
    {
      type: "divest",
      title: "Divest high-risk coastal properties",
      description: "Consider selling properties in low-lying coastal areas with increasing flood risk exposure",
      riskImpact: "Would reduce overall portfolio risk score by 18%",
      financialImpact: "May result in a 5-7% reduction in short-term returns but improve long-term portfolio resilience",
      propertyIds: [selectedPropertyIds[0]],
      portfolioAnalysis: portfolioAnalysis
    },
    {
      type: "invest",
      title: "Invest in climate-resilient regions",
      description: "Add properties in regions with more stable climate projections and lower hazard risk",
      riskImpact: "Would diversify portfolio and reduce risk concentration",
      financialImpact: "Potential for more stable long-term appreciation with reduced insurance premiums",
      propertyIds: [],
      portfolioAnalysis: portfolioAnalysis
    },
    {
      type: "modify",
      title: "Upgrade high-risk properties",
      description: "Implement climate resilience improvements at properties with high but manageable risk",
      riskImpact: "Could reduce specific property risk scores by 25-40%",
      financialImpact: "Initial capital expenditure with ROI through reduced insurance costs and maintained value",
      propertyIds: [selectedPropertyIds[1], selectedPropertyIds[2]],
      portfolioAnalysis: portfolioAnalysis
    }
  ];
  
  setPortfolioRecommendations(recommendations);
  
} catch (error) {
  console.error("Error generating portfolio recommendations:", error);
  // Show error message to user
} finally {
  setAiAnalysisLoading(false);
}
}

// Function to generate AI-powered premium recommendations
async function generatePremiumRecommendation(propertyId) {
if (!propertyId) return;

setAiAnalysisLoading(true);

try {
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    throw new Error("Property not found");
  }
  
  console.log(`Generating AI premium recommendation for property: ${property.name}`);
  
  // Simulate API call to LLM service
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  // Simulating LLM response
  // In a real application, you would send property details to your backend,
  // which would then use the LLM to generate premium recommendations
  
  const standardPremium = Math.floor(Math.random() * 3000) + 2000;
  const riskMultiplier = Math.random() * 0.6 + 0.8; // Between 0.8 and 1.4
  const recommendedPremium = Math.round(standardPremium * riskMultiplier);
  
  // Risk factors affecting premium
  const riskFactors = [
    { name: "Flood zone proximity", impact: Math.random() > 0.5 ? 12.5 : -5.2 },
    { name: "Building construction type", impact: Math.random() > 0.5 ? 8.7 : -7.3 },
    { name: "Local hazard history", impact: Math.random() > 0.5 ? 15.2 : -3.8 },
    { name: "Property age", impact: Math.random() > 0.5 ? 6.8 : -4.2 },
    { name: "Preventative measures", impact: -10.5 }
  ];
  
  // Select 3-4 random factors
  const factorCount = Math.floor(Math.random() * 2) + 3; // 3-4 factors
  const selectedFactors = [];
  while (selectedFactors.length < factorCount) {
    const randomIndex = Math.floor(Math.random() * riskFactors.length);
    if (!selectedFactors.includes(randomIndex)) {
      selectedFactors.push(randomIndex);
    }
  }
  
  const finalRiskFactors = selectedFactors.map(index => riskFactors[index]);
  
  // Coverage recommendations
  const coverageRecommendations = [
    "Increase flood coverage limit due to elevated risk",
    "Add extended replacement cost endorsement",
    "Consider adding water backup coverage",
    "Implement a higher wind/hail deductible to reduce premium",
    "Add ordinance or law coverage for older buildings"
  ];
  
  // Select 2-3 random recommendations
  const recCount = Math.floor(Math.random() * 2) + 2; // 2-3 recommendations
  const selectedRecs = [];
  while (selectedRecs.length < recCount) {
    const randomIndex = Math.floor(Math.random() * coverageRecommendations.length);
    if (!selectedRecs.includes(randomIndex)) {
      selectedRecs.push(randomIndex);
    }
  }
  
  const finalRecs = selectedRecs.map(index => coverageRecommendations[index]);
  
  // Generate analysis text
  const riskScore = Math.round(Math.random() * 6) + 2; // 2-8
  const analysis = `Based on climate risk assessment for ${property.name}, we recommend a ${riskMultiplier > 1 ? 'premium increase' : 'premium reduction'} of ${Math.abs(((riskMultiplier - 1) * 100)).toFixed(1)}% compared to standard market rates. The property has a risk score of ${riskScore}/10, with primary concerns related to ${finalRiskFactors.filter(f => f.impact > 0).map(f => f.name.toLowerCase()).join(' and ')}. Our analysis suggests ${recommendedPremium > standardPremium ? 'additional coverage needs' : 'certain risk mitigating factors'} that justify this adjusted premium. We also recommend reviewing deductible levels and considering additional endorsements for optimal protection.`;
  
  // Store the premium recommendation
  setPremiumRecommendations(prev => ({
    ...prev,
    [propertyId]: {
      standardPremium,
      recommendedPremium,
      riskFactors: finalRiskFactors,
      coverageRecommendations: finalRecs,
      analysis,
      riskScore,
      deductibleRecommendation: Math.round(recommendedPremium * 0.5 / 100) * 100, // Round to nearest $100
      coverageLimit: Math.round(property.value || 500000) // Use property value or default
    }
  }));
  
} catch (error) {
  console.error("Error generating premium recommendation:", error);
  // Show error message to user
} finally {
  setAiAnalysisLoading(false);
}
}

// Update data loading to include property risk ratings for dashboard
const loadData = async () => {
setLoading(true);
setError(null);
try {
  // Fetch properties
  const propertiesRes = await fetch(`${API_BASE_URL}/properties`);
  if (!propertiesRes.ok) {
    throw new Error(`API returned status: ${propertiesRes.status}`);
  }
  const propertiesData = await propertiesRes.json();
  setProperties(propertiesData);
  
  // Fetch premium trends
  const premiumRes = await fetch(`${API_BASE_URL}/underwriting/premium-trends?months=12`);
  if (premiumRes.ok) {
    const premiumData = await premiumRes.json();
    setPremiumTrends(premiumData);
  }
  
  // Fetch active hazards
  const hazardsRes = await fetch(`${API_BASE_URL}/hazards/active`);
  if (hazardsRes.ok) {
    const hazardsData = await hazardsRes.json();
    setActiveHazards(hazardsData);
  }

  // Calculate statistics from properties
  calculateStats(propertiesData);
} catch (err) {
  console.error("Error loading data:", err);
  setError(err.message);
} finally {
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

// Function to handle refresh button click
const handleRefresh = () => {
setRefresh(prev => !prev);
};

useEffect(() => {
loadData();
}, [refresh]);
}import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AlertTriangle, Droplet, Wind, Flame, Cloud, Thermometer, BarChart3, MapPin, DollarSign, Calendar, TrendingUp, Map, Building, Shield, Brain, Calculator, BarChart2 } from 'lucide-react';
import TrackedPropertyList from './TrackedPropertyList';
import RegisterPropertyForm from './RegisterPropertyForm';
import UploadPropertyCSV from './UploadPropertyCSV';

const API_BASE_URL = 'http://localhost:8000';

export default function EnterprisePropertyDashboard() {
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
try {
  // Fetch properties
  const propertiesRes = await fetch(`${API_BASE_URL}/properties`);
  if (!propertiesRes.ok) {
    throw new Error(`API returned status: ${propertiesRes.status}`);
  }
  const propertiesData = await propertiesRes.json();
  setProperties(propertiesData);
  
  // Fetch premium trends
  const premiumRes = await fetch(`${API_BASE_URL}/underwriting/premium-trends?months=12`);
  if (premiumRes.ok) {
    const premiumData = await premiumRes.json();
    setPremiumTrends(premiumData);
  }
  
  // Fetch active hazards
  const hazardsRes = await fetch(`${API_BASE_URL}/hazards/active`);
  if (hazardsRes.ok) {
    const hazardsData = await hazardsRes.json();
    setActiveHazards(hazardsData);
  }

  // Calculate statistics from properties
  calculateStats(propertiesData);
} catch (err) {
  console.error("Error loading data:", err);
  setError(err.message);
} finally {
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
            onClick={() => generatePropertyValuation(selectedProperty)}
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
          onClick={generatePortfolioRecommendations}
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
          <h3 className="text-lg font-bold mb-4">Portfolio Optimization Recommendations</h3>
          
          <div className="mb-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h4 className="font-medium mb-2">AI Portfolio Analysis</h4>
            <p className="text-gray-700">{portfolioRecommendations[0].portfolioAnalysis}</p>
          </div>
          
          <div className="space-y-4">
            {portfolioRecommendations.map((rec, index) => (
              <div key={index} className="border rounded p-4 hover:bg-gray-50">
                <div className="flex items-center mb-2">
                  <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full mr-2 ${rec.type === 'divest' ? 'bg-red-100 text-red-600' : rec.type === 'invest' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    {rec.type === 'divest' ? '−' : rec.type === 'invest' ? '+' : '⚙'}
                  </span>
                  <h4 className="font-bold">{rec.title}</h4>
                </div>
                <p className="text-gray-700 mb-2">{rec.description}</p>
                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-medium">Risk Impact: </span>
                  {rec.riskImpact}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  <span className="font-medium">Financial Impact: </span>
                  {rec.financialImpact}
                </div>
                {rec.propertyIds && rec.propertyIds.length > 0 && (
                  <div className="mt-2">
                    <span className="text-sm font-medium">Related Properties: </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {rec.propertyIds.map(propId => {
                        const property = properties.find(p => p.id === propId);
                        return property ? (
                          <span key={propId} className="px-2 py-1 bg-gray-100 rounded text-xs">
                            {property.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )}

  {/* AI Premium Optimization View */}
  {activeView === 'premium' && (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-4">
          <DollarSign className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold">AI Premium Optimization</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Get AI-powered insurance premium recommendations based on property risk profiles.
          Select a property to analyze optimal premium pricing.
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Property for Premium Analysis</label>
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
            onClick={() => generatePremiumRecommendation(selectedProperty)}
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Standard Premium</h4>
              <p className="text-2xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].standardPremium.toLocaleString()}/year</p>
              <p className="text-sm text-gray-600 mt-1">Market average premium without risk adjustment</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Risk-Adjusted Premium</h4>
              <p className="text-2xl font-bold text-blue-600">${premiumRecommendations[selectedProperty].recommendedPremium.toLocaleString()}/year</p>
              <p className="text-sm text-gray-600 mt-1">
                AI-recommended premium based on risk profile
              </p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Premium Difference</h4>
              <p className={`text-2xl font-bold ${premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? 'text-red-600' : 'text-green-600'}`}>
                {premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? '+' : ''}
                ${(premiumRecommendations[selectedProperty].recommendedPremium - premiumRecommendations[selectedProperty].standardPremium).toLocaleString()}/year
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {Math.abs(((premiumRecommendations[selectedProperty].recommendedPremium / premiumRecommendations[selectedProperty].standardPremium) - 1) * 100).toFixed(1)}% {premiumRecommendations[selectedProperty].recommendedPremium > premiumRecommendations[selectedProperty].standardPremium ? 'increase' : 'decrease'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Risk Factors Affecting Premium</h4>
              <ul className="space-y-2">
                {premiumRecommendations[selectedProperty].riskFactors.map((factor, index) => (
                  <li key={index} className="flex items-start">
                    <span className={`inline-block w-5 text-center ${factor.impact > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {factor.impact > 0 ? '↑' : '↓'}
                    </span>
                    <span className="ml-2">{factor.name} <span className="text-gray-500">({factor.impact > 0 ? '+' : ''}{factor.impact}%)</span></span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Coverage Recommendations</h4>
              <ul className="space-y-2">
                {premiumRecommendations[selectedProperty].coverageRecommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="inline-block w-5 text-center text-blue-500">•</span>
                    <span className="ml-2">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100">
            <h4 className="font-medium mb-2">AI Premium Analysis</h4>
            <p className="text-gray-700">{premiumRecommendations[selectedProperty].analysis}</p>
          </div>
          
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Deductible Recommendation</h4>
              <p className="text-xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].deductibleRecommendation.toLocaleString()}</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Coverage Limit</h4>
              <p className="text-xl font-bold text-gray-700">${premiumRecommendations[selectedProperty].coverageLimit.toLocaleString()}</p>
            </div>
            
            <div className="border p-4 rounded bg-gray-50">
              <h4 className="font-medium mb-2">Risk Score</h4>
              <p className={`text-xl font-bold ${
                premiumRecommendations[selectedProperty].riskScore > 7 ? 'text-red-600' : 
                premiumRecommendations[selectedProperty].riskScore > 4 ? 'text-amber-600' : 
                'text-green-600'
              }`}>
                {premiumRecommendations[selectedProperty].riskScore}/10
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
</div>
);

// Function to generate AI-powered property valuation
async function generatePropertyValuation(propertyId) {
if (!propertyId) return;

setAiAnalysisLoading(true);

try {
  const property = properties.find(p => p.id === propertyId);
  
  if (!property) {
    throw new Error("Property not found");
  }
  
  // In a real application, you would call your backend API here
  // For demonstration, we're simulating an LLM call with a timeout
  
  console.log(`Generating AI valuation for property: ${property.name}`);
  
  // Simulate API call to LLM service
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulating LLM response
  // In a real application, you would send property details to your backend,
  // which would then use the LLM to generate a valuation analysis
  
  const baseValue = Math.floor(Math.random() * 500000) + 500000;
  const riskFactor = Math.random() * 0.3 - 0.15; // Between -15% and +15%
  const adjustedValue = Math.round(baseValue * (1 + riskFactor));
  
  const factorCount = Math.floor(Math.random() * 3) + 3; // 3-5 factors
  const factors = [];
  
  // Risk factors affecting valuation
  const possibleFactors = [
    { description: "Flood risk in the area", impact: -5.2 },
    { description: "Wildfire vulnerability", impact: -7.8 },
    { description: "Hurricane exposure", impact: -4.6 },
    { description: "Storm surge potential", impact: -6.1 },
    { description: "Drought conditions", impact: -3.2 },
    { description: "Recent climate resilience improvements", impact: 4.3 },
    { description: "Property elevation advantage", impact: 3.7 },
    { description: "Modern construction resilience features", impact: 5.1 },
    { description: "Proximity to high-risk zones", impact: -3.9 },
    { description: "Historical weather patterns", impact: 2.8 }
  ];
  
  // Select random factors
  const selectedFactors = [];
  while (selectedFactors.length < factorCount) {
    const randomIndex = Math.floor(Math.random() * possibleFactors.length);
    if (!selectedFactors.includes(randomIndex)) {
      selectedFactors.push(randomIndex);
      factors.push(possibleFactors[randomIndex]);
    }
  }
  
  // Generate analysis text
  const analysis = `Based on climate risk assessment of ${property.name} located at ${property.address}, this property shows ${riskFactor >= 0 ? 'positive resilience factors that slightly increase' : 'vulnerability to several climate hazards that decrease'} its market value by approximately ${Math.abs(riskFactor * 100).toFixed(1)}%. The primary factors affecting valuation are related to ${riskFactor >= 0 ? 'advantageous' : 'concerning'} exposure to ${factors.map(f => f.description.toLowerCase().replace('