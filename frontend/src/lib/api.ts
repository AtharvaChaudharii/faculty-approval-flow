export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!options.body || !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  } else if (headers.has('Content-Type')) {
    // Let browser set multipart boundary for FormData
    headers.delete('Content-Type');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};
