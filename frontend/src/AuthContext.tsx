import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Define a basic user type, expand as needed
interface User {
  name: string; // This will be the Strava ID (principal name)
  stravaId: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  // Add other fields you expect from /api/user/me
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>; // Add a logout function
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuthStatus = useCallback(async () => {
    // console.log("Checking auth status...");
    setIsLoading(true);
    try {
      // Uses Vite proxy if path starts with /api
      const response = await fetch('/api/user/me', {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (response.ok) {
        const userData = await response.json();
        // console.log("User data received:", userData);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        // console.log("Not authenticated, status:", response.status);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
      // console.log("Auth status check finished. isLoading:", false, "isAuthenticated:", isAuthenticated);
    }
  }, []); // Removed isAuthenticated from dependencies to avoid re-check loop on its change

  const logout = async () => {
    // Implement backend logout if necessary (e.g., POST to /logout)
    // For now, just clear frontend state
    // Example: await fetch('/logout', { method: 'POST' }); // If you have a backend logout
    setUser(null);
    setIsAuthenticated(false);
    // Optionally redirect to login page
    // window.location.href = '/login'; // Or use react-router navigate
  };

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, isLoading, checkAuthStatus, logout }}>
      {!isLoading ? children : <div>Loading session...</div>} {/* Show children only when not loading initial auth state */}
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