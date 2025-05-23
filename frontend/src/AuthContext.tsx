// frontend/src/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface User {
  name: string; 
  stravaId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  sex?: string; // 'M', 'F', or null
  city?: string;
  state?: string;
  country?: string;
  // Add other fields you expect from /api/user/me
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/me', {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []); 

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);
    // Optionally, you might want to hit a backend logout endpoint if you have one
    // await fetch('/logout', { method: 'POST' });
    // Consider redirecting after logout, e.g., using useNavigate if within a Router context
    // or window.location.href = '/login';
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, checkAuthStatus, logout }}>
      {!isLoading ? children : <div>Loading session...</div>} 
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};