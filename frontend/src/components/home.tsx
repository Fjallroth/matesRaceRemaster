import React, { useState } from "react";
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
import { PlusCircle, Users, Trophy, Calendar } from "lucide-react";
import RaceCard from "./RaceCard";

interface Race {
  id: string;
  name: string;
  status: "upcoming" | "ongoing" | "finished";
  startDate: string;
  endDate: string;
  participantCount: number;
  organizer: string;
  segments: number;
}

const Home = () => {
  const [activeTab, setActiveTab] = useState("all");

  // Mock data for demonstration
  const mockRaces: Race[] = [
    {
      id: "1",
      name: "Weekend Hill Challenge",
      status: "upcoming",
      startDate: "2023-07-15",
      endDate: "2023-07-17",
      participantCount: 8,
      organizer: "John Doe",
      segments: 3,
    },
    {
      id: "2",
      name: "City Loop Sprint",
      status: "ongoing",
      startDate: "2023-07-01",
      endDate: "2023-07-10",
      participantCount: 12,
      organizer: "Jane Smith",
      segments: 2,
    },
    {
      id: "3",
      name: "Mountain Goat Challenge",
      status: "finished",
      startDate: "2023-06-15",
      endDate: "2023-06-30",
      participantCount: 15,
      organizer: "Mike Johnson",
      segments: 4,
    },
    {
      id: "4",
      name: "Summer Solstice Ride",
      status: "upcoming",
      startDate: "2023-07-20",
      endDate: "2023-07-22",
      participantCount: 6,
      organizer: "Sarah Williams",
      segments: 2,
    },
  ];

  // Filter races based on active tab
  const filteredRaces =
    activeTab === "all"
      ? mockRaces
      : mockRaces.filter((race) => race.status === activeTab);

  return (
    <div className="container mx-auto px-4 py-8 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">MatesRace</h1>
          <p className="text-gray-600 mt-1">
            Race your mates, conquer the segments!
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-green-600 hover:bg-green-700">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Race
          </Button>
          <Button variant="outline">
            <Users className="mr-2 h-4 w-4" /> Join Race
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 md:w-[400px] mb-6">
          <TabsTrigger value="all">All Races</TabsTrigger>
          <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ongoing" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRaces.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

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
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-8 w-8 text-green-500 mr-4" />
                <div>
                  <p className="text-sm text-gray-500">Upcoming Races</p>
                  <p className="text-2xl font-bold">4</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="text-sm text-gray-500">
            Last updated: Today at 12:30 PM
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Home;
