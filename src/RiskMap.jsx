// src/RiskMap.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const API_BASE_URL = 'http://localhost:8000';



// Fix: Define missing icon variables
const defaultIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#0088FE;width:12px;height:12px;border-radius:50%;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const propertyIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#FF8042;width:12px;height:12px;border-radius:50%;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const healthIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#00C49F;width:12px;height:12px;border-radius:50%;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const lifeIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#FFBB28;width:12px;height:12px;border-radius:50%;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const getRiskColor = (relevance) => {
  if (relevance >= 15) return 'red';
  if (relevance >= 10) return 'orange';
  return 'green';
};

const getDomainIcon = (domain) => {
  switch (domain) {
    case "property": return propertyIcon;
    case "health": return healthIcon;
    case "life": return lifeIcon;
    default: return defaultIcon;
  }
}

const createCustomIcon = (color) =>
  L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color:${color};width:12px;height:12px;border-radius:50%;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

const RiskMap = () => {
  const [hazards, setHazards] = useState([]);
  const [articles, setArticles] = useState([]); 

  useEffect(() => {
    fetch(`${API_BASE_URL}/articles?has_location=true`)
      .then(res => res.json())
      .then(setArticles)
      .catch(err => {
        console.error(err);
        // Fallback sample data
        setArticles([
          {
            id: "1",
            title: "Florida Hurricane Risk Increasing",
            domain: "property",
            total_relevance: 16.5,
            lat: 27.8,
            lng: -81.7,
            location_name: "Florida"
          },
          {
            id: "2",
            title: "California Wildfire Season Early Start",
            domain: "property",
            total_relevance: 15.2,
            lat: 36.7,
            lng: -119.4,
            location_name: "California"
          }
        ]);
      });
      
    // Also try to fetch hazards
    fetch(`${API_BASE_URL}/hazards/active`)
      .then(res => res.json())
      .then(setHazards)
      .catch(console.error);
  }, []);
  
  const severityColor = (severity) => {
    return severity === 'Severe' ? 'red' :
           severity === 'Moderate' ? 'orange' : 'yellow';
  };

  // Fix Leaflet icon issue with webpack
  useEffect(() => {
    // This is needed to fix Leaflet default icons with webpack
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  return (
    <MapContainer center={[38.5, -97]} zoom={4} style={{ height: '600px', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {articles.filter(a => a.lat && a.lng).map(a => {
        const color = getRiskColor(a.total_relevance || 0);
        const domain = a.domain ? a.domain.charAt(0).toUpperCase() + a.domain.slice(1) : 'Unknown';

        return (
          <Marker
            key={a.id}
            position={[a.lat, a.lng]}
            icon={getDomainIcon(a.domain)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <div className="font-semibold text-md mb-1">{a.title}</div>
                <div className="text-sm">
                  <span className="font-medium">Domain:</span>{' '}
                  {a.domain ? a.domain.charAt(0).toUpperCase() + a.domain.slice(1) : 'Unknown'}<br />
                  <span className="font-medium">Relevance:</span>{' '}
                  {a.total_relevance?.toFixed(1)} / 20<br />
                  {a.location_name && (
                    <>
                      <span className="font-medium">Location:</span>{' '}
                      {a.location_name}<br />
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {hazards.map(h => (
        <GeoJSON
          key={h.id}
          data={h.area}
          style={{ color: severityColor(h.severity), weight: 2 }}
        >
          <Popup>{h.title}</Popup>
        </GeoJSON>
      ))}
    </MapContainer>
  );
};

export default RiskMap;