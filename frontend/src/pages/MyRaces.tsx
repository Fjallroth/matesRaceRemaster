// src/pages/MyRaces.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Users, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Race } from "@/types/raceTypes"; // This Race type should align with RaceResponseDTO
import { useAuth } from "@/AuthContext";
// import RaceCard from "@/components/RaceCard"; // RaceCard logic is integrated here now

const MyRaces: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("organized");
  const [organizedRaces, setOrganizedRaces] = useState<Race[]>([]);
  const [participatingRaces, setParticipatingRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllRacesData = async () => {
      if (!currentUser || !isAuthenticated) {
        setIsLoading(false);
        if (!isAuthenticated) navigate('/login'); // Redirect if definitely not authenticated
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch all races (for potential filtering or public view if requirements change)
        const allRacesResponse = await fetch("/api/races", {
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
        });

        if (!allRacesResponse.ok) {
          if (allRacesResponse.status === 401) {
            navigate('/login');
            return;
          }
          throw new Error(`Failed to fetch races: ${allRacesResponse.statusText}`);
        }
        const allRacesData: Race[] = await allRacesResponse.json();

        // Filter races organized by the current user
        const userOrganized = allRacesData.filter(
          (race) => race.organiser && race.organiser.stravaId.toString() === currentUser?.stravaId
        );
        setOrganizedRaces(userOrganized);

        // Fetch races the current user is participating in
        const participatingRacesResponse = await fetch("/api/races/participating", {
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
        });

        if (!participatingRacesResponse.ok) {
          if (participatingRacesResponse.status === 401) {
            // Already handled by the first check, but good for safety
            navigate('/login');
            return;
          }
          // Don't throw an error that overwrites the main race fetch error unless critical
          console.error(`Failed to fetch participating races: ${participatingRacesResponse.statusText}`);
          setParticipatingRaces([]); // Set to empty or handle error specifically
        } else {
          const participatingData: Race[] = await participatingRacesResponse.json();
          setParticipatingRaces(participatingData);
        }

      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching race data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Trigger fetch when currentUser is available and authenticated
    // or when isAuthenticated status changes (e.g., after login)
    if (isAuthenticated && currentUser) {
        fetchAllRacesData();
    } else if (isAuthenticated === false) { // Explicitly false, not just null
        setIsLoading(false); // Stop loading if definitely not authenticated
        navigate('/login');
    }
     // If currentUser is null but isAuthenticated is true, auth might still be loading.
     // The isLoading state from useAuth() could be used for a more refined loading experience.

  }, [currentUser, isAuthenticated, navigate]);


  const handleCreateRace = () => {
    navigate("/create-race");
  };

  const handleEditRace = (id: number) => {
    console.log(`Editing race ${id}`);
    // navigate(`/edit-race/${id}`);
  };

  const handleManageParticipants = (id: number) => {
    console.log(`Managing participants for race ${id}`);
    // navigate(`/race/${id}/manage-participants`);
  };

  const handleDeleteRace = async (id: number) => {
    console.log(`Deleting race ${id}`);
    // alert(`Placeholder: Delete race ${id}`);
  };

  const handleViewRace = (id: number) => {
    navigate(`/race/${id}`);
  };
  const navigateToDashboard = () =>{
    navigate(`/home`)
  }

  const getRaceStatus = (startDate?: string, endDate?: string): "upcoming" | "ongoing" | "finished" => {
    if (!startDate || !endDate) return "upcoming"; // Default if dates are missing
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return "upcoming";
    if (now >= start && now <= end) return "ongoing";
    return "finished";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading your races...</p>
      </div>
    );
  }

  if (error && !isLoading) { // Show error only if not loading
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error loading races</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }
  
  const renderRaceList = (races: Race[], emptyMessage: string, showCreateButtonIfEmpty: boolean = false) => {
    if (races.length > 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {races.map((race) => {
            const status = getRaceStatus(race.startDate, race.endDate);
            return (
              <Card key={race.id} className="overflow-hidden flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg hover:underline cursor-pointer" onClick={() => handleViewRace(race.id)}>
                      {race.raceName}
                    </CardTitle>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge className={
                        status === "upcoming" ? "bg-blue-500" :
                        status === "ongoing" ? "bg-green-500" :
                        "bg-gray-500"
                      }>
                        {status}
                      </Badge>
                      {race.isPrivate && (
                        <Badge variant="outline" className="border-orange-400 text-orange-500">
                          Private
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2 h-10">
                    {race.raceInfo || "No description provided."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Dates: </span>
                      {race.startDate && race.endDate ? (
                        <>
                          {format(new Date(race.startDate), "MMM d")} -{" "}
                          {format(new Date(race.endDate), "MMM d, yyyy")}
                        </>
                      ) : "N/A"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">By: </span>
                      {race.organiser?.userStravaFirstName || race.organiser?.displayName || `User ${race.organiser?.stravaId}`}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Participants: </span>
                      {/* Use participantCount from the DTO */}
                      {race.participantCount !== undefined ? race.participantCount : '(N/A)'}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewRace(race.id)}
                    >
                      View
                    </Button>
                    {/* Only show Edit/Delete/Manage for organized races */}
                    {activeTab === 'organized' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRace(race.id)}
                          disabled={status === 'finished'}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageParticipants(race.id)}
                        >
                          <Users className="h-4 w-4 mr-1" /> Participants
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="text-destructive-foreground hover:bg-destructive/90" // Adjusted for typical destructive variant
                          onClick={() => handleDeleteRace(race.id)}
                          disabled={status === 'ongoing'}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      );
    } else {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{emptyMessage}</p>
          {showCreateButtonIfEmpty && (
             <Button onClick={handleCreateRace}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Race
             </Button>
          )}
          {activeTab === 'participating' && !showCreateButtonIfEmpty && (
             <Button onClick={() => navigate("/")}>Find Races to Join</Button>
          )}
        </div>
      );
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Races</h1>
          <p className="text-gray-600 mt-1">
            Manage your races and participants
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white" // Explicitly set text color for dark variants
            onClick={handleCreateRace}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button
            className="outline" onClick={navigateToDashboard}
          >
             Dashboard
          </Button> 
        </div>
      </div>

      <Tabs
        defaultValue="organized"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 md:w-[400px] mb-6">
          <TabsTrigger value="organized">Races I Organize</TabsTrigger>
          <TabsTrigger value="participating">
            Races I'm In
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organized" className="space-y-6">
          {renderRaceList(organizedRaces, "You haven't organized any races yet.", true)}
        </TabsContent>

        <TabsContent value="participating" className="space-y-6">
          {renderRaceList(participatingRaces, "You haven't joined any races yet.")}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyRaces;