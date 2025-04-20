import React, { useEffect, useState } from 'react';


export function FloodRiskMap({ lat: defaultLat, lon: defaultLon }) {
    // Initialize state with props
    const [lat, setLat] = useState(defaultLat);
    const [lon, setLon] = useState(defaultLon);
    const [scenario, setScenario] = useState('current');
    const [risk, setRisk] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const scenarios = ['current', 'rcp4.5', 'rcp8.5'];
    
    // This effect updates the internal state when props change
    useEffect(() => {
        console.log(`FloodRiskMap props updated: lat=${defaultLat}, lon=${defaultLon}`);
        setLat(defaultLat);
        setLon(defaultLon);
    }, [defaultLat, defaultLon]);
  
    // This effect fetches flood data when lat, lon, or scenario changes
    useEffect(() => {
      if (!lat || !lon) return;
      
      const fetchData = async () => {
        setLoading(true);
        setError('');
        try {
          console.log(`Fetching flood data for: lat=${lat}, lon=${lon}, scenario=${scenario}`);
          const res = await fetch(
            `http://localhost:8000/underwriting/flood-risk?lat=${lat}&lon=${lon}&scenario=${scenario}`
          );
          if (!res.ok) throw new Error('Failed to fetch flood data');
          const data = await res.json();
          console.log('Flood risk data received:', data);
          setRisk(data);
        } catch (err) {
          console.error('Flood risk fetch error:', err);
          setError(err.message);
          setRisk(null);
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }, [lat, lon, scenario]);
  
    return (
      <div className="p-6 bg-white rounded-xl shadow space-y-4">
        <h2 className="text-2xl font-bold text-blue-700">Flood Risk Explorer</h2>
  
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-semibold">Latitude:</label>
            <input
              type="number"
              className="ml-2 p-1 border rounded"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Longitude:</label>
            <input
              type="number"
              className="ml-2 p-1 border rounded"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-semibold">Scenario:</label>
            <select
              className="ml-2 p-1 border rounded"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
  
        {loading && <p className="text-gray-500">Loading flood risk...</p>}
        {error && <p className="text-red-600 font-medium">{error}</p>}
  
        {risk && (
          <div className="space-y-2 border-t pt-4">
            <div><strong>📍 Location:</strong> {risk.address}</div>
            <div><strong>⚠️ Risk Level:</strong> {risk.flood_warning_level}</div>
            <div><strong>🌊 Discharge:</strong> {risk.river_discharge} m³/s</div>
            <div><strong>🔢 Flood Probability:</strong> {(risk.flood_probability * 100).toFixed(1)}%</div>
            <div><strong>💰 Recommended Premium:</strong> ×{risk.recommended_premium_factor}</div>
            {risk.pricing_note && (
              <div className="text-sm italic text-gray-600">Note: {risk.pricing_note}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  export default FloodRiskMap;