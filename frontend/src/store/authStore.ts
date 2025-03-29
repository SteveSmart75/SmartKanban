import { create } from 'zustand';
import axios, { isAxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

// User interface (might come from a shared types file)
interface User {
  id: string;
  email: string;
  full_name?: string;
  // Add other relevant user fields if needed
}

// Define the shape of the authentication state
interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: User | null; // Add user field
  isLoading: boolean; // Add isLoading field
  error: string | null; // Add error field
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token`, 
        new URLSearchParams({
          username: email,
          password: password,
        }), 
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      set({ token: access_token, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      let errorMessage = 'Login failed';
      if (isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'Invalid credentials';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    set({ token: null, isAuthenticated: false, user: null });
  },
  validateToken: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ token: null, isAuthenticated: false, isLoading: false });
      return false;
    }
    
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`, { 
          headers: { Authorization: `Bearer ${token}` } 
      });
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      set({ token: token, isAuthenticated: true, user: response.data, isLoading: false });
      return true;
    } catch (error) {
      // Clear token on 401 or other errors
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      set({ token: null, isAuthenticated: false, user: null, isLoading: false, error: null });
      console.log('Token validation failed, clearing session');
      return false;
    }
  },
  register: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        full_name: fullName,
      });
      await get().login(email, password);
    } catch (error: unknown) {
      let errorMessage = 'Registration failed';
      if (isAxiosError(error) && error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
            ? error.response.data.detail 
            : JSON.stringify(error.response.data.detail);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
})); 