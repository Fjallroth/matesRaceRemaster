// frontend/src/components/home.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Users, Trophy, Settings, Loader2, AlertTriangle, Search } from "lucide-react";
import RaceCard from "./RaceCard";
import { Race } from "@/types/raceTypes"; // Removed RaceOrganiser as it's part of Race
import { parseISO } from 'date-fns';
import JoinRaceDialog from "./JoinRaceDialog"; // New Import
import { useAuth } from "@/AuthContext"; // To check if user is logged in

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth(); // Get auth status
  const [activeTab, setActiveTab] = useState<"all" | "ongoing" | "upcoming">("all");
  const [showFinishedOnly, setShowFinishedOnly] = useState(false);
  const [races, setRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isJoinRaceDialogOpen, setIsJoinRaceDialogOpen] = useState(false);


  const fetchRaces = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/races", { // Fetches all races (public, and private ones if user is part of them - backend dependent)
          headers: { 'Accept': 'application/json' },
          credentials: 'include', // Important for auth
      });
      if (!response.ok) {
        // No need to navigate to login from here, AuthContext handles it.
        // Or, backend might return 401 if /api/races requires auth to see anything.
        // For a public dashboard, /api/races should ideally return public races even if not logged in.
        console.warn("Failed to fetch all races for home dashboard, status:", response.status);
        // If it's a 401 and the endpoint *requires* auth, then set races to empty.
        // If it can show public races without auth, handle accordingly.
        setRaces([]); 
        // Let's assume for now it might fail if not authed, but don't throw a blocking error.
        if (response.status !== 401) { // Only throw error for non-auth issues.
            throw new Error(`Failed to fetch races: ${response.statusText}`);
        }
      } else {
        const data: Race[] = await response.json();
        setRaces(data);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching races:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  const getRaceStatus = (startDate?: string, endDate?: string): "upcoming" | "ongoing" | "finished" => {
    if (!startDate || !endDate) return "upcoming";
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "ongoing";
    return "finished";
  };


  const filteredRaces = races
    .map(race => ({
        ...race,
        status: getRaceStatus(race.startDate, race.endDate),
    }))
    .filter((race) => {
        const raceNameLower = race.raceName.toLowerCase();
        const organiserNameLower = `${race.organiser?.userStravaFirstName || ''} ${race.organiser?.userStravaLastName || ''} ${race.organiser?.displayName || ''}`.toLowerCase();
        const searchLower = searchTerm.toLowerCase();

        if (searchTerm && !raceNameLower.includes(searchLower) && !organiserNameLower.includes(searchLower)) {
            return false;
        }
        // Filter out private races if the user is not authenticated (frontend filter, backend should ideally do this too)
        // Or if the race list is already filtered by backend based on auth, this is just a safeguard.
        // if (!isAuthenticated && race.isPrivate) {
        //     return false; 
        // }
        if (showFinishedOnly && race.status !== "finished") return false;
        if (activeTab !== "all" && race.status !== activeTab) return false;
        return true;
  });

  const handleCreateRace = () => {
    if (!isAuthenticated) {
        navigate("/login?message=Please login to create a race.");
        return;
    }
    navigate("/create-race");
  };

  const handleJoinRaceOpenDialog = () => {
    if (!isAuthenticated) {
        navigate("/login?message=Please login to join a race.");
        return;
    }
    setIsJoinRaceDialogOpen(true);
  };

  const handleRaceClick = (id: number) => {
    navigate(`/race/${id}`);
  };

  const handleRaceJoined = () => {
    // Refetch races or participating races to update UI
    fetchRaces(); // Refetch all races for simplicity, or update MyRaces context
    // Could also navigate to MyRaces or the specific race page
    // navigate("/my-races"); 
  };


  if (isLoading && races.length === 0) { // Show full page loader only on initial load
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading races...</p>
      </div>
    );
  }

  if (error && races.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Could Not Load Races</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <p className="text-sm text-muted-foreground mb-4">This might be because you are not logged in, or there was a network issue. Public races might still be available.</p>
        <Button onClick={fetchRaces} className="mr-2">Try Again</Button>
        {!isAuthenticated && <Button variant="outline" onClick={() => navigate("/login")}>Login</Button>}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MatesRace</h1>
          <p className="text-muted-foreground mt-1">Race your mates, conquer the segments!</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/90" onClick={handleCreateRace}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button variant="outline" onClick={handleJoinRaceOpenDialog}>
            <Users className="mr-2 h-4 w-4" /> Join Race
          </Button>
          {isAuthenticated && (
            <Button variant="outline" onClick={() => navigate("/my-races")}>
                <Settings className="mr-2 h-4 w-4" /> My Races
            </Button>
          )}
        </div>
      </div>

       <div className="mb-6 relative">
            <Input
                type="text"
                placeholder="Search races by name or organizer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "all" | "ongoing" | "upcoming")}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="all">All Races</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center mt-4 md:mt-0">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showFinished"
              checked={showFinishedOnly}
              onChange={(e) => setShowFinishedOnly(e.target.checked)}
              className="rounded border-input text-primary focus:ring-primary"
            />
            <label htmlFor="showFinished" className="text-sm font-medium text-foreground">
              Show finished races only
            </label>
          </div>
        </div>
      </div>

      {isLoading && races.length > 0 && ( // Show a smaller loading indicator if races are already partially loaded
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-md">Updating races...</p>
        </div>
      )}

      {filteredRaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaces.map((race) => (
            <RaceCard
              key={race.id}
              id={race.id.toString()}
              name={race.raceName}
              status={race.status as "upcoming" | "ongoing" | "finished"}
              startDate={parseISO(race.startDate)}
              endDate={parseISO(race.endDate)}
              // Ensure participants is an array before accessing length, or use participantCount from DTO
              participantCount={race.participantCount !== undefined ? race.participantCount : (race.participants?.length || 0)}
              organizer={{
                  stravaId: race.organiser.stravaId,
                  displayName: race.organiser.displayName,
                  userStravaFirstName: race.organiser.userStravaFirstName,
                  userStravaLastName: race.organiser.userStravaLastName,
                  userStravaPic: race.organiser.userStravaPic,
              }}
              isPrivate={race.isPrivate}
              onClick={() => handleRaceClick(race.id)}
            />
          ))}
        </div>
      ) : (
        !isLoading && ( // Only show "no races" if not loading
            <div className="text-center py-12">
                <p className="text-xl text-muted-foreground">
                    {searchTerm ? "No races match your search." : "No races available for the selected filters."}
                </p>
                {searchTerm && (
                    <Button variant="link" onClick={() => setSearchTerm("")}>Clear search</Button>
                )}
            </div>
        )
      )}

      {/* Quick Stats Section (can be kept as is or updated with real data later) */}
      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your cycling competition overview (dummy data)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-4 bg-muted/50 rounded-lg">
                <Trophy className="h-8 w-8 text-amber-500 mr-4" />
                <div>
                  <p className="text-sm text-muted-foreground">Races Won</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 text-blue-500 mr-4" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Races Joined</p>
                  <p className="text-2xl font-bold">0</p> {/* This could be updated from user's participating races */}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <JoinRaceDialog
        isOpen={isJoinRaceDialogOpen}
        onOpenChange={setIsJoinRaceDialogOpen}
        onRaceJoined={handleRaceJoined}
      />
    </div>
  );
};

export default Home;