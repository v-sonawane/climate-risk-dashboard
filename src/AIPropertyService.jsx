// ai-property-service.js
const API_BASE_URL = 'http://localhost:8000';

/**
 * Service for working with AI property analysis features
 */
export const AIPropertyService = {
  /**
   * Generate AI-powered property valuation that accounts for climate risks
   * @param {Object} property - Property information
   * @returns {Promise<Object>} Valuation data
   */
  async generatePropertyValuation(property) {
    try {
      const response = await fetch(`${API_BASE_URL}/property-valuation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          name: property.name,
          address: property.address,
          property_type: property.type || 'Residential',
          year_built: property.year_built,
          square_footage: property.square_footage,
          latitude: property.latitude,
          longitude: property.longitude,
          current_value: property.value,
          notes: property.notes
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating property valuation:', error);
      // In a real application, we might want to handle different types of errors differently
      throw error;
    }
  },

  /**
   * Generate AI-powered portfolio recommendations
   * @param {Array} properties - Array of property information
   * @returns {Promise<Object>} Portfolio recommendations
   */
  async generatePortfolioRecommendations(properties) {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio-recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating portfolio recommendations:', error);
      throw error;
    }
  },

  /**
   * Generate AI-powered premium recommendation
   * @param {Object} property - Property information
   * @returns {Promise<Object>} Premium recommendation data
   */
  async generatePremiumRecommendation(property) {
    try {
      const response = await fetch(`${API_BASE_URL}/premium-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: property.id,
          name: property.name,
          address: property.address,
          property_type: property.type || 'Residential',
          year_built: property.year_built,
          latitude: property.latitude,
          longitude: property.longitude,
          current_value: property.value,
          current_premium: property.premium
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating premium recommendation:', error);
      throw error;
    }
  }
};

