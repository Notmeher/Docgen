import { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../utils/api';

const ApiContext = createContext();

export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};

export const ApiProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  useEffect(() => {
    checkConnection();
    // Check for existing task ID in localStorage
    const savedTaskId = localStorage.getItem('currentTaskId');
    if (savedTaskId) {
      setCurrentTaskId(savedTaskId);
    }
  }, []);

  const checkConnection = async () => {
    setIsLoading(true);
    const result = await apiService.checkConnection();
    setIsConnected(result.success);
    setIsLoading(false);
  };

  const startTutorialGeneration = async (data) => {
    const result = await apiService.generateTutorial(data);
    if (result.success && result.data.task_id) {
      setCurrentTaskId(result.data.task_id);
      localStorage.setItem('currentTaskId', result.data.task_id);
    }
    return result;
  };

  const clearCurrentTask = () => {
    setCurrentTaskId(null);
    localStorage.removeItem('currentTaskId');
  };

  const value = {
    isConnected,
    isLoading,
    currentTaskId,
    checkConnection,
    startTutorialGeneration,
    clearCurrentTask,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
};