import React, { useState, useEffect, useRef } from 'react';
import { MapPin, AlertTriangle, Droplet, Flame, Wind } from 'lucide-react';

// A global property portfolio map that visualizes properties and their climate risks
export default function GlobalPropertyMap({ properties = [] }) {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);

  // Risk colors
  const riskColors = {
    flood: '#3b82f6', // blue
    wildfire: '#ef4444', // red
    wind: '#8b5cf6', // purple
    drought: '#f59e0b', // amber
    storm: '#6b7280', // gray
  };

  // Initialize map when component mounts
  useEffect(() => {
    // Create a clean-up function to prevent memory leaks
    let isMounted = true;
    
    // Function to initialize the map
    const initializeMap = () => {
      // Check if window and google maps are available and we have properties
      if (!window.google || !properties.length || !mapContainerRef.current) return;

      try {
        // Create map instance
        const mapInstance = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: 20, lng: 0 },
          zoom: 2,
          styles: [
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#e9e9e9' }, { lightness: 17 }]
            },
            {
              featureType: 'landscape',
              elementType: 'geometry',
              stylers: [{ color: '#f5f5f5' }, { lightness: 20 }]
            }
          ]
        });
        
        // Only update state if component is still mounted
        if (isMounted) {
          mapRef.current = mapInstance;
          setMapLoaded(true);
        }
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
      }
    };

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      // Set up a listener for when Google Maps loads
      const handleMapsLoaded = () => initializeMap();
      window.addEventListener('google-maps-loaded', handleMapsLoaded);
      
      // Clean up event listener
      return () => {
        window.removeEventListener('google-maps-loaded', handleMapsLoaded);
      };
    }
    
    // Clean up function
    return () => {
      isMounted = false;
      // Clear any markers
      if (markersRef.current) {
        markersRef.current.forEach(marker => {
          if (marker) marker.setMap(null);
        });
        markersRef.current = [];
      }
    };
  }, [properties.length]); // Only re-run if properties length changes

  // Add markers when map is loaded and when properties change
  useEffect(() => {
    // Only proceed if map is loaded and we have properties
    if (!mapRef.current || !mapLoaded || !properties.length) return;
    
    // Clear existing markers
    markersRef.current.forEach(marker => {
      if (marker) marker.setMap(null);
    });
    markersRef.current = [];
    
    // Create a bounds object to fit all markers
    const bounds = new window.google.maps.LatLngBounds();
    let hasValidMarkers = false;
    
    // Add markers for each property
    properties.forEach(property => {
      if (!property.latitude || !property.longitude) return;
      
      // Determine marker color based on highest risk
      let markerColor = '#4ade80'; // Default green (low risk)
      
      // Determine if this property has climate risk data
      const hasClimateData = property.climateRisks || property.premiumMultiplier;
      
      if (hasClimateData) {
        if (property.premiumMultiplier > 1.3) {
          markerColor = '#ef4444'; // High risk
        } else if (property.premiumMultiplier > 1.1) {
          markerColor = '#f59e0b'; // Medium risk
        }
      }
      
      try {
        // Create marker
        const marker = new window.google.maps.Marker({
          position: { lat: property.latitude, lng: property.longitude },
          map: mapRef.current,
          title: property.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: markerColor,
            fillOpacity: 0.9,
            strokeWeight: 1,
            strokeColor: '#ffffff',
            scale: 8
          }
        });
        
        // Add click listener
        marker.addListener('click', () => {
          setSelectedProperty(property);
        });
        
        // Extend bounds to include this marker
        bounds.extend(marker.getPosition());
        hasValidMarkers = true;
        
        // Add to marker array
        markersRef.current.push(marker);
      } catch (error) {
        console.error("Error creating marker:", error);
      }
    });
    
    // Fit map to bounds if we have multiple properties
    if (hasValidMarkers) {
      try {
        if (markersRef.current.length > 1) {
          mapRef.current.fitBounds(bounds);
        } else if (markersRef.current.length === 1) {
          mapRef.current.setCenter(markersRef.current[0].getPosition());
          mapRef.current.setZoom(10);
        }
      } catch (error) {
        console.error("Error adjusting map view:", error);
      }
    }
  }, [mapLoaded, properties]);

  // If the Google Maps API isn't available, show a friendly message
  if (typeof window === 'undefined' || !window.google) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-medium">Global Property Portfolio</h3>
        </div>
        <div className="p-8 text-center">
          <p>Loading map data...</p>
          <p className="text-sm text-gray-500 mt-2">
            If the map doesn't appear, please check your internet connection or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Global Property Portfolio</h3>
        <p className="text-sm text-gray-500">
          {properties.length} properties across {
            [...new Set(properties.map(p => 
              p.address?.split(',')?.pop()?.trim() || 'Unknown'
            ))].length
          } regions
        </p>
      </div>
      
      {/* Map container */}
      <div 
        ref={mapContainerRef}
        className="w-full h-96 bg-gray-100"
      >
        {!mapLoaded && (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
            <span className="text-xs">Low Risk</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2"></span>
            <span className="text-xs">Medium Risk</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2"></span>
            <span className="text-xs">High Risk</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-300 mr-2"></span>
            <span className="text-xs">Unassessed</span>
          </div>
        </div>
      </div>
      
      {/* Selected property details */}
      {selectedProperty && (
        <div className="p-4 border-t">
          <div className="flex justify-between">
            <h4 className="font-medium">{selectedProperty.name}</h4>
            <button 
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setSelectedProperty(null)}
            >
              ×
            </button>
          </div>
          <p className="text-sm text-gray-500">{selectedProperty.address}</p>
          
          {selectedProperty.climateRisks ? (
            <div className="mt-3">
              <h5 className="text-sm font-medium mb-2">Climate Risk Profile</h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedProperty.climateRisks || {}).map(([key, value]) => (
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
            </div>
          ) : (
            <div className="mt-3 text-sm text-gray-500">
              No climate risk assessment available
            </div>
          )}
          
          {selectedProperty.premiumMultiplier && (
            <div className="mt-3">
              <h5 className="text-sm font-medium">Premium Multiplier</h5>
              <span className={`text-sm font-medium ${
                selectedProperty.premiumMultiplier > 1.3 
                  ? 'text-red-600' 
                  : selectedProperty.premiumMultiplier > 1.1 
                    ? 'text-amber-600' 
                    : 'text-green-600'
              }`}>
                ×{selectedProperty.premiumMultiplier.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}