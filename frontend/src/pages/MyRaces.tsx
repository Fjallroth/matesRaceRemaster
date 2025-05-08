import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Users, Settings } from "lucide-react";
import { format } from "date-fns";

interface Race {
  id: string;
  name: string;
  description?: string;
  status: "upcoming" | "ongoing" | "finished";
  startDate: Date;
  endDate: Date;
  participantCount: number;
  isPrivate: boolean;
  pendingRequests?: number;
}

const MyRaces: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("organized");

  // Mock data for organized races
  const organizedRaces: Race[] = [
    {
      id: "1",
      name: "Weekend Hill Challenge",
      description: "A challenging hill climb competition over the weekend.",
      status: "upcoming",
      startDate: new Date("2023-07-15"),
      endDate: new Date("2023-07-17"),
      participantCount: 8,
      isPrivate: false,
      pendingRequests: 3,
    },
    {
      id: "2",
      name: "City Loop Sprint",
      description: "Sprint through the city center loop.",
      status: "ongoing",
      startDate: new Date("2023-07-01"),
      endDate: new Date("2023-07-10"),
      participantCount: 12,
      isPrivate: true,
      pendingRequests: 1,
    },
    {
      id: "3",
      name: "Mountain Goat Challenge",
      description: "Test your climbing skills on these mountain segments.",
      status: "finished",
      startDate: new Date("2023-06-15"),
      endDate: new Date("2023-06-30"),
      participantCount: 15,
      isPrivate: false,
    },
  ];

  const handleCreateRace = () => {
    navigate("/create-race");
  };

  const handleEditRace = (id: string) => {
    // In a real app, navigate to edit page with the race ID
    console.log(`Editing race ${id}`);
  };

  const handleManageParticipants = (id: string) => {
    // In a real app, navigate to participant management page
    console.log(`Managing participants for race ${id}`);
  };

  const handleDeleteRace = (id: string) => {
    // In a real app, show confirmation dialog and delete
    console.log(`Deleting race ${id}`);
  };

  const handleViewRace = (id: string) => {
    navigate(`/race/${id}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-green-500 text-white">Ongoing</Badge>;
      case "finished":
        return <Badge className="bg-gray-500 text-white">Finished</Badge>;
      default:
        return <Badge className="bg-blue-500 text-white">{status}</Badge>;
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
            className="bg-green-600 hover:bg-green-700"
            onClick={handleCreateRace}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Dashboard
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
          <TabsTrigger value="participating">Races I'm In</TabsTrigger>
        </TabsList>

        <TabsContent value="organized" className="space-y-6">
          {organizedRaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizedRaces.map((race) => (
                <Card key={race.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{race.name}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {race.description || "No description provided"}
                        </CardDescription>
                      </div>
                      <div>
                        {getStatusBadge(race.status)}
                        {race.isPrivate && (
                          <Badge variant="outline" className="ml-2">
                            Private
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Dates: </span>
                        {format(race.startDate, "MMM d")} -{" "}
                        {format(race.endDate, "MMM d, yyyy")}
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Participants:{" "}
                        </span>
                        {race.participantCount}
                      </div>

                      {race.pendingRequests && race.pendingRequests > 0 && (
                        <div className="mt-2">
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800 hover:bg-amber-200"
                          >
                            {race.pendingRequests} pending request
                            {race.pendingRequests !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleViewRace(race.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditRace(race.id)}
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
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteRace(race.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't organized any races yet
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
              You haven't joined any races yet
            </p>
            <Button onClick={() => navigate("/")}>Find Races to Join</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyRaces;
