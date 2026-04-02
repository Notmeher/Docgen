import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// API functions
export const apiService = {
  // Check API connection
  async checkConnection() {
    try {
      const response = await api.get('/check');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generate tutorial
  async generateTutorial(data) {
    try {
      const response = await api.post('/generate-tutorial', data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Get tutorial status
  async getTutorialStatus(taskId) {
    try {
      const response = await api.get(`/tutorial-status/${taskId}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // List tutorials (alias for consistency)
  async getTutorials() {
    try {
      const response = await api.get('/list-tutorials');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // List tutorials
  async listTutorials() {
    return this.getTutorials();
  },

  // List tutorial files
  async listTutorialFiles(tutorialName) {
    try {
      const response = await api.get(`/tutorial/${tutorialName}/files`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Get tutorial file (alias for consistency)
  async getTutorialFile(tutorialPath, file) {
    try {
      // Extract tutorial name from path if needed
      const tutorialName = tutorialPath.includes('/') ? 
        tutorialPath.split('/').pop() : tutorialPath;
      
      const response = await api.get(`/tutorial/${tutorialName}/file/${file.name}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Get markdown file
  async getMarkdownFile(tutorialName, filename) {
    try {
      const response = await api.get(`/tutorial/${tutorialName}/file/${filename}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Delete tutorial
  async deleteTutorial(tutorialName) {
    try {
      const response = await api.delete(`/tutorial/${tutorialName}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || error.message };
    }
  },

  // Validate local directory
  async validateDirectory(directoryPath, options = {}) {
    try {
      const response = await api.post('/validate-directory', {
        directory_path: directoryPath,
        include_patterns: options.includePatterns,
        exclude_patterns: options.excludePatterns,
        max_file_size: options.maxFileSize || 100000
      });
      return { success: true, data: response.data };
    } catch (error) {
      // Handle FastAPI validation errors (422) which return arrays
      let errorMessage = error.message;
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Format validation errors as readable string
          errorMessage = error.response.data.detail
            .map(err => `${err.loc?.join('.')}: ${err.msg}`)
            .join('; ');
        } else {
          errorMessage = error.response.data.detail;
        }
      }
      return { success: false, error: errorMessage };
    }
  },
};

export default api;