import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import RaceDetail from "./pages/RaceDetail";
import CreateRaceForm from "./components/CreateRaceForm";
import Login from "./pages/Login";
import MyRaces from "./pages/MyRaces";
import routes from "tempo-routes";

function App() {
  // In a real app, this would check for authentication
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen">
          <p>Loading...</p>
        </div>
      }
    >
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
          />
          <Route
            path="/race/:raceId"
            element={
              isAuthenticated ? <RaceDetail /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/create-race"
            element={
              isAuthenticated ? <CreateRaceForm /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/my-races"
            element={isAuthenticated ? <MyRaces /> : <Navigate to="/login" />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </>
    </Suspense>
  );
}

export default App;
