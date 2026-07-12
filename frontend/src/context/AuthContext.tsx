import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'https://lifeos-ai-backend.onrender.com';

interface User {
  id: string;
  email: string;
  name: string;
  age?: number | null;
  occupation?: string | null;
  timezone?: string | null;
  streak?: number;
  notificationEnabled?: boolean;
  reminderTimes?: string;
  authProvider?: string;
  profilePicture?: string | null;
  profileSetup?: {
    preferredWorkingHoursStart?: string;
    preferredWorkingHoursEnd?: string;
    lifeGoals?: string;
    skills?: string;
    interests?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User }>;
  loginWithGoogle: (credential: string, timezone?: string) => Promise<{ user: User; isNew: boolean }>;
  register: (data: { email: string; name: string; age?: string; occupation?: string; timezone?: string; password?: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User> & { preferredWorkingHoursStart?: string; preferredWorkingHoursEnd?: string; lifeGoals?: string; skills?: string; interests?: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('lifeos_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('lifeos_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  const fetchProfile = useCallback(async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or invalid - silently log out
        logout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // On mount – validate persisted token
  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []); // Only on mount

  const login = async (email: string, password: string): Promise<{ user: User }> => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');

    localStorage.setItem('lifeos_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return { user: data.user };
  };

  const loginWithGoogle = async (credential: string, timezone?: string): Promise<{ user: User; isNew: boolean }> => {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const response = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential, timezone: tz }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Google login failed');

    const isNew = !data.user.loginCount || data.user.loginCount <= 1;
    localStorage.setItem('lifeos_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return { user: data.user, isNew };
  };

  const register = async (regData: any) => {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Registration failed');

    localStorage.setItem('lifeos_token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const updateProfile = async (profileData: any) => {
    const response = await fetch(`${API_BASE}/api/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Profile update failed');
    setUser(data);
  };

  const refreshProfile = async () => {
    if (token) await fetchProfile(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
