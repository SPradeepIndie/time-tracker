// API Configuration
// Change this to your backend URL
// For Android emulator: use 10.0.2.2 instead of localhost
// For iOS simulator: use localhost
// For physical device: use your computer's IP address

export const API_CONFIG = {
  // Default to localhost for web/iOS simulator
  BASE_URL: 'http://localhost:8080',
  
  // Uncomment and use your IP for physical device testing
  // BASE_URL: 'http://192.168.1.x:8080',
  
  // Uncomment for Android emulator
  // BASE_URL: 'http://10.0.2.2:8080',
};

// Health check endpoint
export const HEALTH_CHECK_ENDPOINT = '/health';

// API Endpoints
export const ENDPOINTS = {
  TRACKERS: '/trackers',
  TRACKER_BY_ID: (id: number) => `/trackers/${id}`,
};
