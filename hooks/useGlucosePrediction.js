// hooks/useGlucosePrediction.js
import { useCallback, useState } from 'react';
import { glucoseApi } from './useGlucoseApi';

export const useGlucosePrediction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const predictGlucose = useCallback(async (predictionData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await glucoseApi.predictGlucose(predictionData);
      setPrediction(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Prediction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPrediction = useCallback(() => {
    setPrediction(null);
    setError(null);
  }, []);

  return {
    predictGlucose,
    prediction,
    loading,
    error,
    clearPrediction,
  };
};