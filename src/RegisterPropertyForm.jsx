import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function RegisterPropertyForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    notes: ''
  });
  const [status, setStatus] = useState('');

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Registering...');
    
    try {
      let latitude = null;
      let longitude = null;
      
      // Try to geocode the address
      try {
        console.log(`Geocoding address: "${form.address}"`);
        const geoRes = await fetch(
          `http://localhost:8000/geocode?address=${encodeURIComponent(form.address)}`
        );
        
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          console.log('Geocode result:', geoData);
          
          if (geoData.latitude && geoData.longitude) {
            latitude = geoData.latitude;
            longitude = geoData.longitude;
          }
        } else {
          console.warn(`Geocoding failed with status: ${geoRes.status}`);
        }
      } catch (geoErr) {
        console.error('Geocoding error:', geoErr);
      }
      
      // Use fallback coordinates if geocoding failed
      if (!latitude || !longitude) {
        console.log('Using fallback coordinates');
        // Generate different coordinates based on the address
        const hash = form.address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        latitude = 33.7490 + (hash % 10) / 100;
        longitude = -84.3880 - (hash % 10) / 100;
      }
      
      // Create a unique ID
      const id = uuidv4();
      console.log(`Creating property with ID: ${id}`);
      
      const propertyData = {
        id: id,
        name: form.name,
        address: form.address,
        latitude: latitude,
        longitude: longitude,
        notes: form.notes
      };
      
      console.log('Sending property data:', propertyData);
      
      // Register the property
      const response = await fetch('http://localhost:8000/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(propertyData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      console.log('Registration successful');
      setStatus('Property registered ✔️');
      setForm({ name: '', address: '', latitude: '', longitude: '', notes: '' });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Registration error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-3">
      <h3 className="text-lg font-bold">Register New Property</h3>
      <div>
        <label>Name</label>
        <input name="name" value={form.name} onChange={handleChange} required className="w-full border p-1 rounded" />
      </div>
      <div>
        <label>Address</label>
        <input name="address" value={form.address} onChange={handleChange} required className="w-full border p-1 rounded" />
      </div>
      <div>
        <label>Notes (optional)</label>
        <input name="notes" value={form.notes} onChange={handleChange} className="w-full border p-1 rounded" />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
        Submit
      </button>
      {status && <div className="text-sm text-gray-700 mt-2">{status}</div>}
    </form>
  );
}

export default RegisterPropertyForm;