import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Users, Info, Lock, Unlock } from "lucide-react"; // Added Info icon
import { RaceOrganiser } from "@/types/raceTypes"; // Ensure this type path is correct

interface RaceCardProps {
  id: string; // Race ID is already a prop
  name: string;
  status: "upcoming" | "ongoing" | "finished";
  startDate: Date;
  endDate: Date;
  participantCount: number;
  organizer: RaceOrganiser;
  isPrivate: boolean;
  onClick: () => void;
}

const RaceCard: React.FC<RaceCardProps> = ({
  id,
  name,
  status,
  startDate,
  endDate,
  participantCount,
  organizer,
  isPrivate,
  onClick,
}) => {
  const getStatusBadgeColor = () => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500 hover:bg-blue-600";
      case "ongoing":
        return "bg-green-500 hover:bg-green-600";
      case "finished":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <Card
      className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col cursor-pointer h-full"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-semibold text-primary leading-tight">
            {name}
          </CardTitle>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={`${getStatusBadgeColor()} text-white text-xs px-2 py-0.5`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
            {isPrivate ? (
              <Badge variant="outline" className="border-orange-400 text-orange-500 text-xs px-2 py-0.5">
                <Lock className="h-3 w-3 mr-1" /> Private
              </Badge>
            ) : (
              <Badge variant="outline" className="border-green-400 text-green-500 text-xs px-2 py-0.5">
                <Unlock className="h-3 w-3 mr-1" /> Public
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Organized by: {organizer?.userStravaFirstName || organizer?.displayName || `User ${organizer?.stravaId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-2 text-sm">
        <div>
          <span className="font-medium text-muted-foreground">Dates: </span>
          {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
        </div>
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-muted-foreground">Participants: </span>
          <span className="ml-1 font-semibold">{participantCount}</span>
        </div>
        <div className="flex items-center mt-1">
            <Info className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground">Race ID: </span>
            <span className="ml-1 font-semibold text-indigo-600">{id}</span>
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-4 text-xs text-muted-foreground">
        Click to view details
      </CardFooter>
    </Card>
  );
};

export default RaceCard;