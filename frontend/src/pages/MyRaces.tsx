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
  CardFooter, // Import CardFooter if you plan to use it
} from "@/components/ui/card";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Already in RaceCard
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Users, Settings, Loader2, AlertTriangle } from "lucide-react"; // Added Loader2, AlertTriangle
import { format } from "date-fns";
import { Race, RaceOrganiser } from "@/types/raceTypes"; // Adjust path if needed
import { useAuth } from "@/AuthContext"; // To get current user for filtering
import RaceCard from "@/components/RaceCard"; // Import RaceCard

// Define or import the Organizer type if it's slightly different for display
// For now, RaceOrganiser from raceTypes should be fine for the card.

const MyRaces: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth(); // Get the authenticated user
  const [activeTab, setActiveTab] = useState("organized");
  const [organizedRaces, setOrganizedRaces] = useState<Race[]>([]);
  const [participatingRaces, setParticipatingRaces] = useState<Race[]>([]); // Placeholder
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRaces = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/races", {
           headers: {
            'Accept': 'application/json',
            // Ensure credentials are sent if your session is cookie-based
          },
          credentials: 'include', // Important for sending session cookies
        });
        if (!response.ok) {
          if (response.status === 401) {
            navigate('/login'); // Redirect if not authenticated
            return;
          }
          throw new Error(`Failed to fetch races: ${response.statusText}`);
        }
        const data: Race[] = await response.json();

        // Filter races organized by the current user
        // Backend's Race entity has organiser.stravaId
        // currentUser from AuthContext has stravaId (as string, ensure comparison is correct)
        const userOrganized = data.filter(
          (race) => race.organiser && race.organiser.stravaId.toString() === currentUser?.stravaId
        );
        setOrganizedRaces(userOrganized);

        // TODO: Filter races the current user is participating in
        // This will require backend changes or more complex frontend filtering
        // For now, setParticipatingRaces([]);
        setParticipatingRaces([]); // Or filter if participant data is included in `Race`

      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching races:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser) { // Only fetch if user is loaded
        fetchRaces();
    } else {
        setIsLoading(false); // Stop loading if no user (e.g., auth still loading or failed)
    }
  }, [currentUser, navigate]);


  const handleCreateRace = () => {
    navigate("/create-race");
  };

  const handleEditRace = (id: number) => {
    console.log(`Editing race ${id}`);
    // navigate(`/edit-race/${id}`); // Example navigation
  };

  const handleManageParticipants = (id: number) => {
    console.log(`Managing participants for race ${id}`);
    // navigate(`/race/${id}/manage-participants`); // Example
  };

  const handleDeleteRace = async (id: number) => {
    // TODO: Implement confirmation dialog and API call for deletion
    console.log(`Deleting race ${id}`);
    alert(`Placeholder: Delete race ${id}`);
    // Example:
    // if (window.confirm("Are you sure you want to delete this race?")) {
    //   try {
    //     const response = await fetch(`/api/races/${id}`, { method: 'DELETE', credentials: 'include' });
    //     if (!response.ok) throw new Error("Failed to delete race");
    //     setOrganizedRaces(prev => prev.filter(race => race.id !== id));
    //   } catch (error) {
    //     console.error("Error deleting race:", error);
    //     setError("Could not delete the race.");
    //   }
    // }
  };

  const handleViewRace = (id: number) => {
    navigate(`/race/${id}`);
  };

  // Function to determine race status (you might want to move this to a utils file)
  const getRaceStatus = (startDate: string, endDate: string): "upcoming" | "ongoing" | "finished" => {
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error loading races</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

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
            className="bg-green-600 hover:bg-green-700"
            onClick={handleCreateRace}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          {/* Removed "Back to Dashboard" as this might be a primary view */}
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
          <TabsTrigger value="participating" disabled={participatingRaces.length === 0 && organizedRaces.length > 0}>
            Races I'm In
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organized" className="space-y-6">
          {organizedRaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizedRaces.map((race) => (
                <Card key={race.id} className="overflow-hidden flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg hover:underline cursor-pointer" onClick={() => handleViewRace(race.id)}>
                        {race.raceName}
                      </CardTitle>
                      <div className="flex flex-col items-end space-y-1">
                         <Badge className={
                           getRaceStatus(race.startDate, race.endDate) === "upcoming" ? "bg-blue-500" :
                           getRaceStatus(race.startDate, race.endDate) === "ongoing" ? "bg-green-500" :
                           "bg-gray-500"
                         }>
                           {getRaceStatus(race.startDate, race.endDate)}
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
                        {format(new Date(race.startDate), "MMM d")} -{" "}
                        {format(new Date(race.endDate), "MMM d, yyyy")}
                      </div>
                      <div>
                        <span className="text-muted-foreground">By: </span>
                        {race.organiser.userStravaFirstName || race.organiser.displayName || `User ${race.organiser.stravaId}`}
                      </div>
                       {/* Placeholder for participant count - you'll need to fetch this */}
                      <div>
                        <span className="text-muted-foreground">Participants: </span>
                        {/* race.participantCount || 0 */}
                        (N/A)
                      </div>
                      {/* Placeholder for pending requests */}
                      {/* {race.pendingRequests && race.pendingRequests > 0 && ( ... )} */}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRace(race.id)}
                           disabled={getRaceStatus(race.startDate, race.endDate) === 'finished'}
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
                          variant="destructive" // Assuming you have or will create this variant
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRace(race.id)}
                          disabled={getRaceStatus(race.startDate, race.endDate) === 'ongoing'}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't organized any races yet.
              </p>
              <Button onClick={handleCreateRace}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Race
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participating" className="space-y-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Races you are participating in will appear here.
            </p>
            {/* <Button onClick={() => navigate("/")}>Find Races to Join</Button> */}
             {/* TODO: Add functionality to find/join races */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyRaces;