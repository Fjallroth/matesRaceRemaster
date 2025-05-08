import React, { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Trophy, Calendar, Settings } from "lucide-react";
import RaceCard from "./RaceCard";

interface Race {
  id: string;
  name: string;
  status: "upcoming" | "ongoing" | "finished";
  startDate: Date;
  endDate: Date;
  participantCount: number;
  organizer: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  isPrivate?: boolean;
}

const Home = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [showFinishedOnly, setShowFinishedOnly] = useState(false);

  const mockRaces: Race[] = [
    {
      id: "1",
      name: "Weekend Hill Challenge",
      status: "upcoming",
      startDate: new Date("2023-07-15"),
      endDate: new Date("2023-07-17"),
      participantCount: 8,
      organizer: { id: "1", name: "John Doe" },
      isPrivate: false,
    },
    {
      id: "2",
      name: "City Loop Sprint",
      status: "ongoing",
      startDate: new Date("2023-07-01"),
      endDate: new Date("2023-07-10"),
      participantCount: 12,
      organizer: {
        id: "2",
        name: "Jane Smith",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
      },
      isPrivate: true,
    },
    {
      id: "3",
      name: "Mountain Goat Challenge",
      status: "finished",
      startDate: new Date("2023-06-15"),
      endDate: new Date("2023-06-30"),
      participantCount: 15,
      organizer: { id: "3", name: "Mike Johnson" },
      isPrivate: false,
    },
    {
      id: "4",
      name: "Summer Solstice Ride",
      status: "upcoming",
      startDate: new Date("2023-07-20"),
      endDate: new Date("2023-07-22"),
      participantCount: 6,
      organizer: { id: "4", name: "Sarah Williams" },
      isPrivate: true,
    },
  ];

  const filteredRaces = mockRaces.filter((race) => {
    if (showFinishedOnly && race.status !== "finished") return false;
    if (activeTab !== "all" && race.status !== activeTab) return false;
    return true;
  });

  const handleCreateRace = () => {
    navigate("/create-race");
  };

  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [joinRaceData, setJoinRaceData] = useState({ raceName: "", password: "" });

  const handleJoinRace = () => {
    setJoinDialogOpen(true);
  };

  const handleJoinRaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinDialogOpen(false);
    navigate(`/race/1`);
  };

  const handleRaceClick = (id: string) => {
    navigate(`/race/${id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MatesRace</h1>
          <p className="text-gray-600 mt-1">Race your mates, conquer the segments!</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateRace}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button variant="outline" onClick={handleJoinRace}>
            <Users className="mr-2 h-4 w-4" /> Join Race
          </Button>
          <Button variant="outline" onClick={() => navigate('/my-races')}>
            <Settings className="mr-2 h-4 w-4" /> My Races
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={setActiveTab}
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
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="showFinished" className="text-sm font-medium">Show finished races only</label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRaces.map((race) => (
            <RaceCard
              key={race.id}
              id={race.id}
              name={race.name}
              status={race.status}
              startDate={race.startDate}
              endDate={race.endDate}
              participantCount={race.participantCount}
              organizer={race.organizer}
              isPrivate={race.isPrivate}
              onClick={handleRaceClick}
            />
          ))}
        </div>
      </div>

      <div className="mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Your cycling competition overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Trophy className="h-8 w-8 text-amber-500 mr-4" />
                <div>
                  <p className="text-sm text-gray-500">Races Won</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Users className="h-8 w-8 text-blue-500 mr-4" />
                <div>
                  <p className="text-sm text-gray-500">Active Races</p>
                  <p className="text-2xl font-bold">2</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;