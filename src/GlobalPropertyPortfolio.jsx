import React, { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Droplet, Flame, Wind, Map as MapIcon } from 'lucide-react';

// This is a standalone component that can be integrated into the dashboard
export default function GlobalPropertyPortfolio({ properties }) {
  const [viewType, setViewType] = useState('summary');
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex items-center mb-4">
          <MapIcon className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-bold">Global Portfolio Visualization</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Visualize your property portfolio's global distribution and climate risk exposure.
        </p>
        
        {/* View switcher */}
        <div className="flex space-x-2 mb-4">
          <button
            className={`px-3 py-1 rounded-md ${viewType === 'summary' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setViewType('summary')}
          >
            Portfolio Summary
          </button>
          <button
            className={`px-3 py-1 rounded-md ${viewType === 'risk' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}
            onClick={() => setViewType('risk')}
          >
            Risk Analysis
          </button>
        </div>
      </div>

      {viewType === 'summary' ? (
        <PortfolioSummary properties={properties} />
      ) : (
        <RiskAnalysis properties={properties} />
      )}
    </div>
  );
}

// Portfolio Summary Component
function PortfolioSummary({ properties }) {
  // Calculate some basic portfolio stats
  const totalPropertyValue = properties.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
  
  // Group properties by region
  const regionGroups = properties.reduce((groups, property) => {
    const region = property.address?.split(',').pop()?.trim() || 'Unknown';
    if (!groups[region]) groups[region] = [];
    groups[region].push(property);
    return groups;
  }, {});
  
  return (
    <div className="space-y-6">
      {/* Portfolio Overview Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Portfolio Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Total Properties</div>
            <div className="text-2xl font-bold">{properties.length}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Total Value</div>
            <div className="text-2xl font-bold">${(totalPropertyValue/1000000).toFixed(1)}M</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-sm text-amber-700 mb-1">Regions</div>
            <div className="text-2xl font-bold">{Object.keys(regionGroups).length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-700 mb-1">Avg. Value</div>
            <div className="text-2xl font-bold">
              ${properties.length ? ((totalPropertyValue/properties.length)/1000).toFixed(1):K}
            </div>
          </div>
        </div>
      </div>
      
      {/* Regional Distribution */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Regional Distribution</h3>
        <div className="space-y-3">
          {Object.entries(regionGroups)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([region, props]) => {
              // Calculate percentage of total
              const percentage = (props.length / properties.length) * 100;
              // Calculate regional value
              const regionalValue = props.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0);
              
              return (
                <div key={region} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <div className="font-medium">{region}</div>
                    <div className="text-gray-500">{props.length} properties</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <div>{percentage.toFixed(1)}% of portfolio</div>
                    <div>${(regionalValue/1000000).toFixed(1)}M total value</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
      
      {/* High-Value Properties */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Top 5 Properties by Value</h3>
        <div className="space-y-3">
          {[...properties]
            .sort((a, b) => (parseFloat(b.value) || 0) - (parseFloat(a.value) || 0))
            .slice(0, 5)
            .map((property, index) => (
              <div key={index} className="flex justify-between border-b pb-3">
                <div>
                  <div className="font-medium">{property.name}</div>
                  <div className="text-sm text-gray-500">{property.address}</div>
                </div>
                <div className="font-bold">${parseFloat(property.value).toLocaleString()}</div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// Risk Analysis Component
function RiskAnalysis({ properties }) {
  // Categorize properties by risk level
  const riskGroups = {
    high: [],
    medium: [],
    low: [],
    unknown: []
  };
  
  properties.forEach(property => {
    if (property.premiumMultiplier > 1.3) {
      riskGroups.high.push(property);
    } else if (property.premiumMultiplier > 1.1) {
      riskGroups.medium.push(property);
    } else if (property.premiumMultiplier) {
      riskGroups.low.push(property);
    } else {
      // If no premium multiplier, try to categorize by climate risk data
      if (property.climateRisks) {
        const risks = Object.values(property.climateRisks);
        if (risks.some(r => r?.level === 'High')) {
          riskGroups.high.push(property);
        } else if (risks.some(r => r?.level === 'Medium')) {
          riskGroups.medium.push(property);
        } else {
          riskGroups.low.push(property);
        }
      } else {
        // If no data at all, mark as unknown
        riskGroups.unknown.push(property);
      }
    }
  });
  
  // Calculate risk statistics
  const riskStats = {
    highRiskValue: riskGroups.high.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0),
    highRiskPercentage: (riskGroups.high.length / properties.length) * 100,
    mediumRiskValue: riskGroups.medium.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0),
    mediumRiskPercentage: (riskGroups.medium.length / properties.length) * 100,
    lowRiskValue: riskGroups.low.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0),
    lowRiskPercentage: (riskGroups.low.length / properties.length) * 100,
  };
  
  // Define the hazard types we want to count
  const hazardTypes = ['flood', 'wildfire', 'wind', 'storm', 'drought'];
  
  // Count properties with each hazard type at high risk
  const hazardCounts = hazardTypes.reduce((counts, hazard) => {
    counts[hazard] = properties.filter(p => 
      p.climateRisks && p.climateRisks[hazard] && p.climateRisks[hazard].level === 'High'
    ).length;
    return counts;
  }, {});
  
  return (
    <div className="space-y-6">
      {/* Risk Distribution Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Risk Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-700 mb-1">High Risk</div>
            <div className="text-2xl font-bold">{riskGroups.high.length}</div>
            <div className="text-sm text-red-700 mt-1">
              {riskStats.highRiskPercentage.toFixed(1)}% of properties
            </div>
            <div className="text-sm text-red-700">
              ${(riskStats.highRiskValue/1000000).toFixed(1)}M total value
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-4">
            <div className="text-sm text-amber-700 mb-1">Medium Risk</div>
            <div className="text-2xl font-bold">{riskGroups.medium.length}</div>
            <div className="text-sm text-amber-700 mt-1">
              {riskStats.mediumRiskPercentage.toFixed(1)}% of properties
            </div>
            <div className="text-sm text-amber-700">
              ${(riskStats.mediumRiskValue/1000000).toFixed(1)}M total value
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">Low Risk</div>
            <div className="text-2xl font-bold">{riskGroups.low.length}</div>
            <div className="text-sm text-green-700 mt-1">
              {riskStats.lowRiskPercentage.toFixed(1)}% of properties
            </div>
            <div className="text-sm text-green-700">
              ${(riskStats.lowRiskValue/1000000).toFixed(1)}M total value
            </div>
          </div>
        </div>
      </div>
      
      {/* Hazard Type Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">Hazard Type Exposure</h3>
        <div className="space-y-4">
          {hazardTypes.map(hazard => {
            const count = hazardCounts[hazard];
            const percentage = (count / properties.length) * 100;
            
            return (
              <div key={hazard} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {hazard === 'flood' && <Droplet className="h-5 w-5 text-blue-500" />}
                  {hazard === 'wildfire' && <Flame className="h-5 w-5 text-red-500" />}
                  {hazard === 'wind' && <Wind className="h-5 w-5 text-purple-500" />}
                  {hazard === 'storm' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                  {hazard === 'drought' && <MapPin className="h-5 w-5 text-orange-500" />}
                  <div className="font-medium capitalize">{hazard} Risk</div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      hazard === 'flood' ? 'bg-blue-600' :
                      hazard === 'wildfire' ? 'bg-red-600' :
                      hazard === 'wind' ? 'bg-purple-600' :
                      hazard === 'storm' ? 'bg-amber-600' :
                      'bg-orange-600'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <div>{count} properties at high risk</div>
                  <div>{percentage.toFixed(1)}% of portfolio</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* High Risk Properties */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">High Risk Properties</h3>
        {riskGroups.high.length > 0 ? (
          <div className="space-y-3">
            {riskGroups.high.map((property, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <div className="font-medium">{property.name}</div>
                  <div className="text-red-600 font-medium">
                    {property.premiumMultiplier ? `×${property.premiumMultiplier.toFixed(1)}` : 'High Risk'}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mb-2">{property.address}</div>
                
                {/* Climate risks if available */}
                {property.climateRisks && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(property.climateRisks).map(([key, value]) => (
                      value && value.level !== 'Low' ? (
                        <div 
                          key={key}
                          className={`text-xs px-2 py-1 rounded-full flex items-center ${
                            value.level === 'High' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {key === 'flood' && <Droplet className="h-3 w-3 mr-1" />}
                          {key === 'wildfire' && <Flame className="h-3 w-3 mr-1" />}
                          {key === 'wind' && <Wind className="h-3 w-3 mr-1" />}
                          {key === 'storm' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {value.level} {key}
                        </div>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No high risk properties detected in the portfolio
          </div>
        )}
      </div>
    </div>
  );
}