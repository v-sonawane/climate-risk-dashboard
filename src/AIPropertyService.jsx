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
      throw error;
    }
  },

  /**
   * Generate AI-powered portfolio recommendations
   * @param {Array} properties - Array of property information
   * @returns {Promise<Array>} Portfolio recommendations array ready for UI
   */
  async generatePortfolioRecommendations(properties) {
    try {
      console.log('Sending request to portfolio-recommendations API with', properties.length, 'properties');
      
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

      // Parse the response JSON
      const data = await response.json();
      console.log('Received response from portfolio-recommendations API:', data);
      
      // Check if the response has the expected structure
      if (!data || !data.recommendations || !Array.isArray(data.recommendations)) {
        console.error('Unexpected API response format:', data);
        throw new Error('Invalid API response format - missing recommendations array');
      }
      
      // Transform the API response to match the UI's expected format
      // This is crucial - your frontend component expects a different format than the API returns
      const formattedRecommendations = data.recommendations.map(rec => {
        return {
          title: rec.title,
          description: rec.description,
          potentialImpact: rec.riskImpact,
          summary: rec.portfolioAnalysis
        };
      });
      
      console.log('Transformed recommendations for UI:', formattedRecommendations);
      return formattedRecommendations;
    } catch (error) {
      console.error('Error in generatePortfolioRecommendations:', error);
      throw error; // Let the component handle the error
    }
  },
  
  /**
   * Create fallback recommendations when needed
   * Used by the UI component if the API call fails
   * @param {Array} properties - The properties array
   * @returns {Array} Formatted fallback recommendations
   */
  createFallbackRecommendations(properties) {
    console.log('Creating fallback recommendations for', properties.length, 'properties');
    
    // Get property IDs for general recommendations
    const propertyIds = properties.map(p => p.id);
    
    // Identify properties in potentially high-risk areas based on names
    const highRiskProps = properties.filter(p => {
      const name = (p.name || '').toLowerCase();
      const address = (p.address || '').toLowerCase();
      return name.includes('coast') || 
             name.includes('beach') || 
             name.includes('shore') ||
             name.includes('river') ||
             name.includes('lake') ||
             address.includes('florida') ||
             address.includes('louisiana') ||
             address.includes('coast');
    });
    
    // Create formatted recommendations for the UI
    return [
      {
        title: "Conduct Climate Risk Assessment",
        description: "Engage specialists to evaluate each property's exposure to climate hazards including flooding, wildfire, and extreme weather events.",
        potentialImpact: "High risk reduction through identification of specific vulnerabilities",
        summary: "A comprehensive climate risk assessment is recommended as the foundation for your portfolio's climate strategy."
      },
      {
        title: "Implement Property-Specific Resilience Measures",
        description: "Based on identified risks, upgrade properties with appropriate resilience features such as flood barriers, stormwater management, and structural reinforcements.",
        potentialImpact: "Medium to high impact on reducing physical damage from climate events",
        summary: highRiskProps.length > 0 
          ? `${highRiskProps.length} properties in your portfolio may have elevated climate risk exposure based on their location.` 
          : "Physical resilience measures can significantly reduce damage costs during extreme weather events."
      },
      {
        title: "Optimize Insurance Coverage",
        description: "Review and adjust insurance policies to ensure adequate coverage for climate-related risks while avoiding unnecessary premium costs.",
        potentialImpact: "Medium financial protection through risk transfer",
        summary: "Insurance optimization provides immediate risk reduction benefits through appropriate risk transfer."
      }
    ];
  },

  /**
   * Generate AI-powered premium recommendation
   * @param {Object} property - Property information
   * @returns {Promise<Object>} Premium recommendation data
   */
  async generatePremiumRecommendation(property) {
    try {
      console.log('Sending premium recommendation request for property:', 
        {id: property.id, name: property.name, address: property.address});
      
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
  
      // Parse the response JSON
      const data = await response.json();
      console.log('Received premium recommendation response:', data);
      
      // Check for required fields and fix if needed
      if (!data.property_id) {
        data.property_id = property.id;
      }
      
      if (!data.standardPremium && data.current_premium) {
        // Handle alternate field names if they exist
        data.standardPremium = data.current_premium;
      }
      
      if (!data.recommendedPremium && data.recommended_premium) {
        data.recommendedPremium = data.recommended_premium;
      }
      
      if (!data.riskFactors && data.risk_factors) {
        data.riskFactors = data.risk_factors;
      }
      
      // Ensure we have the minimum expected data
      if (!data.standardPremium || !data.recommendedPremium) {
        console.warn('Premium recommendation missing required fields:', data);
        throw new Error('Incomplete premium recommendation data received');
      }
      
      return data;
    } catch (error) {
      console.error('Error generating premium recommendation:', error);
      throw error;
    }
  }
};