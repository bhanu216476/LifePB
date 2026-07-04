import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  age?: number | null;
  occupation?: string | null;
  timezone?: string | null;
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
  login: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      } else {
        // Token might be invalid/expired
        logout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('lifeos_token', data.token);
    setToken(data.token);
  };

  const register = async (regData: any) => {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('lifeos_token', data.token);
    setToken(data.token);
  };

  const logout = () => {
    localStorage.removeItem('lifeos_token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (profileData: any) => {
    const response = await fetch('http://localhost:5000/api/auth/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Profile update failed');
    }
    setUser(data);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
