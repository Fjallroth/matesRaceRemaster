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
import { Race } from "@/types/raceTypes";
import { parseISO } from 'date-fns';
import JoinRaceDialog from "./JoinRaceDialog";
import { useAuth } from "@/AuthContext";
import { useToast } from "@/components/ui/use-toast"; // For user feedback

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useAuth();
  const { toast } = useToast();
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
      const response = await fetch("/api/races", {
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
      });
      if (!response.ok) {
        console.warn("Failed to fetch all races for home dashboard, status:", response.status);
        setRaces([]); 
        if (response.status !== 401) {
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

  const handleViewRaceDetails = (id: number | string) => {
    navigate(`/race/${id}`);
  };

  const handleRaceJoined = () => {
    fetchRaces(); 
    toast({ title: "Race Joined!", description: "You have successfully joined the race." });
  };

  // --- New handlers for race actions ---
  const handleEditRaceClick = (raceId: string) => {
    // Navigate to an edit race page (ensure this route and component exist)
    // e.g., navigate(`/edit-race/${raceId}`);
    console.log(`Placeholder: Edit race ${raceId}`);
    toast({ title: "Edit Race", description: `Navigating to edit page for race ${raceId}. (Placeholder)` });
    // Example navigation: navigate(`/race/${raceId}/edit`); // You'll need to create this route and page
  };

  const handleManageParticipantsClick = (raceId: string) => {
    // Navigate to a manage participants page (ensure this route and component exist)
    // e.g., navigate(`/race/${raceId}/manage-participants`);
    console.log(`Placeholder: Manage participants for race ${raceId}`);
    toast({ title: "Manage Participants", description: `Navigating to participant management for race ${raceId}. (Placeholder)` });
    // Example navigation: navigate(`/race/${raceId}/participants`); // You'll need to create this route and page
  };

  const handleDeleteRaceClick = async (raceId: string) => {
    if (!window.confirm("Are you sure you want to delete this race? This action cannot be undone.")) {
      return;
    }
    try {
      // Replace with your actual API call
      const response = await fetch(`/api/races/${raceId}`, { 
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({ title: "Race Deleted", description: `Race ${raceId} has been successfully deleted.` });
        fetchRaces(); // Refresh the list of races
      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete race." }));
        throw new Error(errorData.message || `Failed to delete race. Status: ${response.status}`);
      }
    } catch (err: any) {
      console.error("Error deleting race:", err);
      toast({ variant: "destructive", title: "Error", description: err.message || "Could not delete the race." });
    }
  };



  if (isLoading && races.length === 0) {
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
        <p className="text-sm text-muted-foreground mb-4">This might be because you are not logged in, or there was a network issue.</p>
        <Button onClick={fetchRaces} className="mr-2">Try Again</Button>
        {!isAuthenticated && <Button variant="outline" onClick={() => navigate("/login")}>Login</Button>}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MatesRace Dashboard</h1>
          <p className="text-muted-foreground mt-1">Discover, join, and manage your cycling races.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-primary hover:bg-primary/90" onClick={handleCreateRace}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button variant="outline" onClick={handleJoinRaceOpenDialog}>
            <Users className="mr-2 h-4 w-4" /> Join Race
          </Button>
          {/* Removed "My Races" button as functionality is integrated */}
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
          <TabsList className="grid grid-cols-4 md:w-[400px]">
            <TabsTrigger value="all">All Races</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="finished">Finished</TabsTrigger>
          </TabsList>
        </Tabs>
        
      </div>

      {isLoading && races.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-md">Updating races...</p>
        </div>
      )}

      {filteredRaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaces.map((race) => {
            const isOrganizedByCurrentUser = isAuthenticated && currentUser?.stravaId === race.organiser.stravaId.toString();
            return (
              <RaceCard
                key={race.id}
                id={race.id.toString()}
                name={race.raceName}
                status={race.status as "upcoming" | "ongoing" | "finished"}
                startDate={parseISO(race.startDate)}
                endDate={parseISO(race.endDate)}
                participantCount={race.participantCount !== undefined ? race.participantCount : (race.participants?.length || 0)}
                organizer={race.organiser}
                isPrivate={race.isPrivate}
                onClick={() => handleViewRaceDetails(race.id)}
                isOrganizedByCurrentUser={isOrganizedByCurrentUser}
                onEditRaceClick={isOrganizedByCurrentUser ? handleEditRaceClick : undefined}
                onManageParticipantsClick={isOrganizedByCurrentUser ? handleManageParticipantsClick : undefined}
                onDeleteRaceClick={isOrganizedByCurrentUser ? handleDeleteRaceClick : undefined}
              />
            );
          })}
        </div>
      ) : (
        !isLoading && (
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
                  <p className="text-2xl font-bold">0</p> 
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