import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login.tsx';
import Home from './components/home.tsx'; // Assuming this is your home component
import MyRaces from './pages/MyRaces.tsx';
import RaceDetail from './pages/RaceDetail.tsx';
import CreateRaceForm from './components/CreateRaceForm.tsx';
import { useAuth } from './AuthContext.tsx'; // Import useAuth

// Define a type for your user object if you haven't already
// interface User {
//   name: string;
//   // other properties
// }

// This component can be used to wrap routes that need authentication
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    // You can render a loading spinner or null while checking auth
    return <div>Loading authentication...</div>;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to so we can send them there after they login.
    // If you don't want to pass state, just <Navigate to="/login" replace /> is fine.
    return <Navigate to="/login" replace />;
  }

  return <Outlet />; // This will render the child route element
};

const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Potentially show a global loading spinner while initial auth check is in progress
  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading Application...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}> {/* Wrap protected routes */}
          <Route path="/home" element={<Home />} />
          <Route path="/my-races" element={<MyRaces />} />
          <Route path="/race/:raceId" element={<RaceDetail />} />
          <Route path="/create-race" element={<CreateRaceForm />} />
          {/* Add any other routes that need authentication here */}
        </Route>

        {/* Default Route */}
        {/* If already authenticated, redirect from "/" to "/home", else to "/login" */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />}
        />

        {/* Fallback for unknown routes (optional) */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/home" : "/login"} replace />} />
      </Routes>
    </Router>
  );
};

export default App;