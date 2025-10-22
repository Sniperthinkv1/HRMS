// API Configuration for different environments
export const API_CONFIG = {
  // Automatically detect environment
  getBaseUrl: () => {
    // First, check if environment variable is set (for Vercel/production builds)
    const envApiUrl = import.meta.env.VITE_API_BASE_URL;
    if (envApiUrl) {
      console.log('[API Config] Using environment variable:', envApiUrl);
      return envApiUrl;
    }

    const hostname = window.location.hostname;
    console.log('[API Config] Hostname detected:', hostname);
    
    // Production: Vercel deployment
    if (hostname === "hrms-frontend-phi.vercel.app" || hostname.includes("vercel.app")) {
      console.log('[API Config] Vercel detected, using Railway backend');
      return "https://hrms-production-ed39.up.railway.app";
    }

    // For localhost/development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      console.log('[API Config] Localhost detected, using local backend');
      return "http://127.0.0.1:8000";
    }

    // If we're on the old production server
    if (hostname === "15.207.246.171") {
      return `http://${hostname}`;
    }

    // Default fallback for any other domain (prefer HTTPS)
    const fallback = window.location.protocol === "https:" 
      ? `https://${hostname}` 
      : `http://${hostname}`;
    console.log('[API Config] Using fallback:', fallback);
    return fallback;
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
