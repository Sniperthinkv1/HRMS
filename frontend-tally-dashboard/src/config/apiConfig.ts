// API Configuration for different environments
export const API_CONFIG = {
  // Automatically detect environment
  getBaseUrl: () => {
    // If we're on the production server, use the same domain
    if (window.location.hostname === "15.207.246.171") {
      return `http://${window.location.hostname}`;
    }

    // For localhost/development
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://127.0.0.1:8000";
    }

    // For any other domain, use the current domain
    return `http://${window.location.hostname}`;
  },

  // Get the full API URL
  getApiUrl: (endpoint: string = "") => {
    const baseUrl = API_CONFIG.getBaseUrl();
    return `${baseUrl}/api${endpoint}`;
  },
};

// Export the base URL for backward compatibility
export const API_BASE_URL = API_CONFIG.getBaseUrl();
export const API_BASE = API_CONFIG.getApiUrl();
