import React from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import axios from 'axios';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Helper for API calls
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

// Global API error handler
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle auth error - redirect to login
      window.localStorage.removeItem('token');
      window.sessionStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export { api };

// Root component
const App = () => {
  const navigate = useNavigate();

  // Check auth on mount
  const checkAuth = () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token && window.location.pathname !== '/login') {
      navigate('/login');
    }
  };

  return null;
};

export default App;