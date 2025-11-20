// hooks/useGlucoseApi.js
const API_BASE_URL = 'https://web-production-04ca1.up.railway.app';

class GlucoseApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🚀 API Service initialized with URL:', this.baseUrl);
  }

  async healthCheck() {
    try {
      console.log('🏥 Making health check to:', `${this.baseUrl}/health`);
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Health check response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Health check success:', data);
      return data;
    } catch (error) {
      console.error('❌ Health check error:', error);
      throw error;
    }
  }

  async predictGlucose(predictionData) {
  try {
    console.log('🎯 Making prediction to:', `${this.baseUrl}/predict`);
    console.log('📦 Prediction data:', predictionData);
    
    const response = await fetch(`${this.baseUrl}/predict`, {  // SINGLE SLASH - CORRECT
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(predictionData),
    });

    console.log('📡 Prediction response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Prediction API error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Prediction success:', data);
    return data;
  } catch (error) {
    console.error('❌ Prediction request failed:', error);
    throw error;
  }
}

  async trainModel(patientId) {
    const response = await fetch(`${this.baseUrl}/train/${patientId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Training failed' }));
      throw new Error(errorData.detail || `Training failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getModelStatus(patientId) {
    const response = await fetch(`${this.baseUrl}/status/${patientId}`);
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.statusText}`);
    }

    return response.json();
  }
}

export const glucoseApi = new GlucoseApiService();