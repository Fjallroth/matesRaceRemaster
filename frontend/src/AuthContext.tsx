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
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuthStatus: (triggerLogoutOn401?: boolean) => Promise<void>;
  logout: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async (triggerLogoutOn401: boolean = false) => { // Added parameter with default value
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
        if (response.status === 401 && triggerLogoutOn401) {
          // If a 401 occurs AND we're asked to trigger logout, update auth state.
          // App.tsx will handle redirection due to isAuthenticated becoming false.
          setUser(null);
          setIsAuthenticated(false);
        } else if (response.status !== 401) {
          // For non-401 errors, or 401s we're not explicitly handling by logging out here.
          setUser(null);
          setIsAuthenticated(false);
        }
        // If it's a 401 and triggerLogoutOn401 is false (e.g., during initial load),
        // ProtectedRoute will handle the redirection.
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []); // useCallback dependencies are empty, which is fine here.

  const logout = async () => {
    setUser(null);
    setIsAuthenticated(false);

  };

  useEffect(() => {
    checkAuthStatus(); // Initial check without triggerLogoutOn401
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