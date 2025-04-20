import React, { useEffect, useState } from 'react';
import { AlertTriangle, Droplet, Wind, Flame, Thermometer, Cloud } from 'lucide-react';

export function PropertyClimateRisks({ lat, lon }) {
  const [risks, setRisks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [floodData, setFloodData] = useState(null);

  useEffect(() => {
    if (!lat || !lon) return;
    
    const fetchWeatherData = async () => {
      setLoading(true);
      setError('');
      try {
        console.log(`Fetching weather data for: lat=${lat}, lon=${lon}`);
        
        // Fetch weather forecast data from Open-Meteo
        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?` +
          `latitude=${lat}&longitude=${lon}` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,` +
          `windspeed_10m_max,windgusts_10m_max` +
          `&timezone=auto&forecast_days=14`
        );
        
        if (!weatherResponse.ok) {
          throw new Error(`Weather API error: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather data received:', weatherData);
        setWeatherData(weatherData);

        // Fetch flood risk data from Open-Meteo
        const floodResponse = await fetch(
          `https://flood-api.open-meteo.com/v1/flood?` +
          `latitude=${lat}&longitude=${lon}` +
          `&daily=river_discharge,river_discharge_max`
        );
        
        if (!floodResponse.ok) {
          throw new Error(`Flood API error: ${floodResponse.status}`);
        }
        
        const floodData = await floodResponse.json();
        console.log('Flood data received:', floodData);
        setFloodData(floodData);
        
        // Process all data to calculate risk levels
        calculateRisks(weatherData, floodData);
      } catch (err) {
        console.error('Error fetching climate data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [lat, lon]);
  
  const calculateRisks = (weatherData, floodData) => {
    if (!weatherData || !weatherData.daily || !floodData || !floodData.daily) {
      return;
    }
    
    // Extract data for analysis
    const maxTemps = weatherData.daily.temperature_2m_max;
    const minTemps = weatherData.daily.temperature_2m_min;
    const precipSums = weatherData.daily.precipitation_sum;
    const precipProbs = weatherData.daily.precipitation_probability_max;
    const windSpeeds = weatherData.daily.windspeed_10m_max;
    const windGusts = weatherData.daily.windgusts_10m_max;
    const riverDischarge = floodData.daily.river_discharge;
    const riverDischargeMax = floodData.daily.river_discharge_max;
    
    // FLOOD RISK - based on river discharge
    const avgDischarge = riverDischarge.reduce((sum, val) => sum + val, 0) / riverDischarge.length;
    const maxDischarge = Math.max(...riverDischarge);
    const dischargeRatio = maxDischarge / (avgDischarge || 1); // Avoid division by zero
    
    let floodLevel, floodProbability, floodDetail;
    
    if (maxDischarge > 500 || dischargeRatio > 2) {
      floodLevel = 'High';
      floodProbability = Math.min(90, Math.round(dischargeRatio * 30));
      floodDetail = `High flood risk with maximum river discharge of ${maxDischarge.toFixed(1)} m³/s`;
    } else if (maxDischarge > 200 || dischargeRatio > 1.5) {
      floodLevel = 'Medium';
      floodProbability = Math.min(70, Math.round(dischargeRatio * 20));
      floodDetail = `Moderate flood risk with elevated river discharge levels`;
    } else {
      floodLevel = 'Low';
      floodProbability = Math.min(30, Math.round(dischargeRatio * 10));
      floodDetail = `Low flood risk based on current river discharge data`;
    }
    
    // WILDFIRE RISK - based on temperature and precipitation
    const avgMaxTemp = maxTemps.reduce((sum, val) => sum + val, 0) / maxTemps.length;
    const avgPrecip = precipSums.reduce((sum, val) => sum + val, 0) / precipSums.length;
    const dryDays = precipSums.filter(val => val < 1).length;
    const fireRiskFactor = (avgMaxTemp - 15) * (dryDays / precipSums.length) * 10;
    
    let wildfireLevel, wildfireProbability, wildfireDetail;
    
    if (fireRiskFactor > 100) {
      wildfireLevel = 'High';
      wildfireProbability = Math.min(90, Math.round(fireRiskFactor / 2));
      wildfireDetail = `High fire danger due to high temperatures and dry conditions`;
    } else if (fireRiskFactor > 50) {
      wildfireLevel = 'Medium';
      wildfireProbability = Math.min(60, Math.round(fireRiskFactor / 2));
      wildfireDetail = `Moderate fire risk with periods of elevated temperature`;
    } else {
      wildfireLevel = 'Low';
      wildfireProbability = Math.min(30, Math.round(fireRiskFactor / 2));
      wildfireDetail = `Low fire risk based on current temperature and precipitation patterns`;
    }
    
    // WIND/HURRICANE RISK - based on wind speeds and gusts
    const maxWindSpeed = Math.max(...windSpeeds);
    const maxGust = Math.max(...windGusts);
    const windRatio = maxGust / (maxWindSpeed || 1); // Avoid division by zero
    
    let windLevel, windProbability, windDetail;
    
    if (maxGust > 80 || maxWindSpeed > 50) {
      windLevel = 'High';
      windProbability = Math.min(80, Math.round(maxGust));
      windDetail = `High wind risk with maximum gusts of ${maxGust.toFixed(1)} km/h`;
    } else if (maxGust > 50 || maxWindSpeed > 30) {
      windLevel = 'Medium';
      windProbability = Math.min(60, Math.round(maxGust / 1.5));
      windDetail = `Moderate wind risk with gusts reaching ${maxGust.toFixed(1)} km/h`;
    } else {
      windLevel = 'Low';
      windProbability = Math.min(30, Math.round(maxGust / 2));
      windDetail = `Low wind risk with maximum gusts below damaging levels`;
    }
    
    // DROUGHT RISK - based on precipitation and temperature
    const precipDeficit = 10 - avgPrecip; // Assuming 10mm/day is normal
    const tempExcess = avgMaxTemp - 20; // Assuming 20°C is a baseline
    const droughtFactor = precipDeficit * tempExcess;
    
    let droughtLevel, droughtProbability, droughtDetail;
    
    if (droughtFactor > 50) {
      droughtLevel = 'High';
      droughtProbability = Math.min(90, Math.round(50 + droughtFactor));
      droughtDetail = `High drought risk due to rainfall deficit and high temperatures`;
    } else if (droughtFactor > 20) {
      droughtLevel = 'Medium';
      droughtProbability = Math.min(70, Math.round(30 + droughtFactor));
      droughtDetail = `Moderate drought potential with below-average precipitation`;
    } else {
      droughtLevel = 'Low';
      droughtProbability = Math.max(10, Math.min(30, Math.round(droughtFactor)));
      droughtDetail = `Low drought risk based on precipitation patterns`;
    }
    
    // STORM RISK - based on precipitation probability and wind
    const maxPrecipProb = Math.max(...precipProbs);
    const stormFactor = (maxPrecipProb / 100) * (maxGust / 50) * 100;
    
    let stormLevel, stormProbability, stormDetail;
    
    if (stormFactor > 100) {
      stormLevel = 'High';
      stormProbability = Math.min(90, Math.round(stormFactor / 2));
      stormDetail = `High storm/hail risk with strong precipitation probability and wind`;
    } else if (stormFactor > 50) {
      stormLevel = 'Medium';
      stormProbability = Math.min(60, Math.round(stormFactor / 2));
      stormDetail = `Moderate storm risk with potential for heavy rainfall periods`;
    } else {
      stormLevel = 'Low';
      stormProbability = Math.min(30, Math.round(stormFactor / 2));
      stormDetail = `Low storm/hail risk based on current precipitation and wind patterns`;
    }
    
    // Calculate premium multiplier based on all risks
    const premiumMultiplier = calculatePremiumMultiplier(
      floodLevel, 
      wildfireLevel, 
      windLevel,
      droughtLevel,
      stormLevel
    );
    
    // Set the complete risk assessment
    setRisks({
      flood: {
        level: floodLevel,
        probability: floodProbability,
        detail: floodDetail
      },
      wildfire: {
        level: wildfireLevel,
        probability: wildfireProbability,
        detail: wildfireDetail
      },
      wind: {
        level: windLevel,
        probability: windProbability,
        detail: windDetail
      },
      drought: {
        level: droughtLevel,
        probability: droughtProbability,
        detail: droughtDetail
      },
      storm: {
        level: stormLevel,
        probability: stormProbability,
        detail: stormDetail
      },
      premium: premiumMultiplier,
      raw: {
        weather: weatherData,
        flood: floodData
      }
    });
  };
  
  // Calculate a premium multiplier based on risk levels
  const calculatePremiumMultiplier = (...riskLevels) => {
    let multiplier = 1.0;
    
    riskLevels.forEach(level => {
      if (level === 'High') multiplier += 0.5;
      else if (level === 'Medium') multiplier += 0.2;
    });
    
    return Math.round(multiplier * 10) / 10; // Round to 1 decimal place
  };
  
  // Style for risk level badges
  const getRiskBadgeStyle = (level) => {
    switch (level) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Icon for each risk type
  const getRiskIcon = (riskType) => {
    switch (riskType) {
      case 'flood':
        return <Droplet className="h-4 w-4 text-blue-500" />;
      case 'wildfire':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'wind':
        return <Wind className="h-4 w-4 text-purple-500" />;
      case 'drought':
        return <Thermometer className="h-4 w-4 text-amber-500" />;
      case 'storm':
        return <Cloud className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200 text-red-700">
        <div className="flex items-center mb-2">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <h3 className="font-semibold">Error Loading Climate Risks</h3>
        </div>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!risks) {
    return null;
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Climate Risk Assessment</h3>
      
      <div className="space-y-4">
        {/* Flood Risk */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              {getRiskIcon('flood')}
              <span className="ml-2 font-medium">Flood Risk</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeStyle(risks.flood.level)}`}>
              {risks.flood.level}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Probability: {risks.flood.probability}%</span>
          </div>
          <p className="text-sm mt-1 text-gray-600">{risks.flood.detail}</p>
        </div>
        
        {/* Wildfire Risk */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              {getRiskIcon('wildfire')}
              <span className="ml-2 font-medium">Wildfire Risk</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeStyle(risks.wildfire.level)}`}>
              {risks.wildfire.level}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Probability: {risks.wildfire.probability}%</span>
          </div>
          <p className="text-sm mt-1 text-gray-600">{risks.wildfire.detail}</p>
        </div>
        
        {/* Wind/Hurricane Risk */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              {getRiskIcon('wind')}
              <span className="ml-2 font-medium">Wind/Hurricane Risk</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeStyle(risks.wind.level)}`}>
              {risks.wind.level}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Probability: {risks.wind.probability}%</span>
          </div>
          <p className="text-sm mt-1 text-gray-600">{risks.wind.detail}</p>
        </div>
        
        {/* Drought Risk */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              {getRiskIcon('drought')}
              <span className="ml-2 font-medium">Drought Risk</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeStyle(risks.drought.level)}`}>
              {risks.drought.level}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Probability: {risks.drought.probability}%</span>
          </div>
          <p className="text-sm mt-1 text-gray-600">{risks.drought.detail}</p>
        </div>
        
        {/* Hail/Storm Risk */}
        <div className="border-b pb-3">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              {getRiskIcon('storm')}
              <span className="ml-2 font-medium">Hail/Storm Risk</span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getRiskBadgeStyle(risks.storm.level)}`}>
              {risks.storm.level}
            </span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Probability: {risks.storm.probability}%</span>
          </div>
          <p className="text-sm mt-1 text-gray-600">{risks.storm.detail}</p>
        </div>
        
        {/* Premium Impact */}
        <div className="mt-4 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Recommended Premium Multiplier:</span>
            <span className={`text-lg font-bold ${risks.premium > 2 ? 'text-red-600' : risks.premium > 1.5 ? 'text-orange-600' : 'text-blue-600'}`}>
              ×{risks.premium}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {risks.premium > 2 
              ? 'High risk location - significant premium increase recommended' 
              : risks.premium > 1.5 
              ? 'Moderate risk location - premium increase recommended'
              : 'Relatively low risk location - standard premium'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default PropertyClimateRisks;