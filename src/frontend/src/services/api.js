import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // No hardcoded fallback to prevent hidden failures
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add Authorization header automatically
api.interceptors.request.use(
  (config) => {
    // Try to get token from both student and educator session info
    const stuInfo = JSON.parse(sessionStorage.getItem('stu_info'));
    const eduInfo = JSON.parse(sessionStorage.getItem('edu_info'));
    const token = stuInfo?.token || eduInfo?.token;

    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor for centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - could clear session and redirect to login
      console.error('Unauthorized access - potential token expiry');
    }
    return Promise.reject(error);
  }
);

export default api;
