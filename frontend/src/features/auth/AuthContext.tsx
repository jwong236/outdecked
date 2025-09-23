'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiConfig } from '../../lib/apiConfig';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'moderator' | 'user';
  display_name?: string;
  avatar_url?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updatePreferences: (preferences: Record<string, string>) => Promise<boolean>;
  preferences: Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<Record<string, string>>({});

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/me');
      console.log('Attempting to fetch:', url); // Debug log
      
      // Try a simple fetch first without credentials
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 SESSION DEBUG - User data from API:', data.user);
        setUser(data.user);
        await loadUserPreferences();
        
        // Session data will be loaded by useSessionInitialization hook
      } else if (response.status === 401) {
        // 401 is expected when not logged in - this is not an error
        console.log('User not authenticated (401) - this is normal');
        setUser(null);
      } else {
        // Other error statuses
        console.error('Unexpected response status:', response.status);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const url = apiConfig.getApiUrl('/api/users/me/preferences');
      console.log('Loading user preferences:', url);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
      
      console.log('Preferences response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      } else if (response.status === 404) {
        // 404 is normal for new users who don't have preferences yet
        console.log('No user preferences found (404) - this is normal for new users');
        setPreferences({});
      } else {
        console.log('Unexpected response status for preferences:', response.status);
        setPreferences({});
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/login');
      console.log('Attempting login:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      
      console.log('Login response status:', response.status);
      console.log('Login response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Login successful:', data);
        setUser(data.user);
        await loadUserPreferences();
        
        // Session data will be loaded by useSessionInitialization hook
        
        return true;
      } else {
        console.log('Login failed with status:', response.status);
        const errorData = await response.json().catch(() => ({}));
        console.log('Login error data:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/register');
      console.log('Attempting registration:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
      
      console.log('Register response status:', response.status);

      if (response.ok) {
        // After successful registration, automatically log the user in
        const loginSuccess = await login(username, password);
        if (loginSuccess) {
          return { success: true };
        } else {
          return { success: false, error: 'Registration successful, but automatic login failed. Please sign in manually.' };
        }
      } else {
        const data = await response.json();
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const url = apiConfig.getApiUrl('/api/auth/logout');
      
      await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setPreferences({});
      
      // Session data will be cleared by useSessionInitialization hook
    }
  };

  const updatePreferences = async (newPreferences: Record<string, string>): Promise<boolean> => {
    try {
      const response = await fetch(apiConfig.getApiUrl('/api/users/me/preferences'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences: newPreferences }),
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, ...newPreferences }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update preferences:', error);
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updatePreferences,
    preferences,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
