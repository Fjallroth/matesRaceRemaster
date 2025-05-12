// src/components/RaceCard.tsx
import React from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns"; // Added parseISO
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, Lock } from "lucide-react";
import { RaceOrganiser } from "@/types/raceTypes"; // Import your main organiser type

// Define props for the RaceCard component
interface RaceCardProps {
  id: string; // Keep as string if navigation uses string IDs
  name: string;
  status: "upcoming" | "ongoing" | "finished"; // This will be passed after calculation
  startDate: Date; // Expect Date object
  endDate: Date;   // Expect Date object
  participantCount: number;
  organizer: RaceOrganiser; // Use the backend-aligned organiser type
  isPrivate: boolean;
  onClick: (id: string) => void;
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
  const getStatusBadge = () => {
    // Colors moved to parent component to avoid re-declaration if status is pre-calculated
    if (status === "upcoming") return <Badge className="bg-blue-500 text-primary-foreground">Upcoming</Badge>;
    if (status === "ongoing") return <Badge className="bg-green-500 text-primary-foreground">Ongoing</Badge>;
    if (status === "finished") return <Badge className="bg-gray-500 text-primary-foreground">Finished</Badge>;
    return <Badge>{status}</Badge>; // Fallback
  };

  const organizerName =
    (organizer.userStravaFirstName || organizer.userStravaLastName
      ? `${organizer.userStravaFirstName || ""} ${organizer.userStravaLastName || ""}`
      : organizer.displayName) || `User ${organizer.stravaId}`;

  const getInitials = (): string => {
    const first = organizer.userStravaFirstName?.[0] || "";
    const last = organizer.userStravaLastName?.[0] || "";
    return (first + last).toUpperCase() || "MR";
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow duration-200 cursor-pointer flex flex-col h-full bg-card text-card-foreground"
      onClick={() => onClick(id)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-semibold leading-tight">
            {name}
          </CardTitle>
          <div className="flex flex-col items-end flex-shrink-0 space-y-1">
            {getStatusBadge()}
            {isPrivate && (
              <Badge variant="outline" className="border-orange-500 text-orange-600 mt-1">
                <Lock className="h-3 w-3 mr-1" /> Private
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <Avatar className="h-4 w-4 mr-1.5">
              <AvatarImage src={organizer.userStravaPic} alt={organizerName} />
              <AvatarFallback className="text-[8px]">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            Organized by {organizerName}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-4">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground/80" />
            <span>
              {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
            </span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2 text-muted-foreground/80" />
            <span>
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
              {/* This count will be 0 or based on fetched data */}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-4 border-t">
        <p className="text-xs text-muted-foreground/70">
          {status === "upcoming" && startDate > new Date() && `Starts in ${formatDistanceToNow(startDate)}`}
          {status === "ongoing" && endDate > new Date() && `Ends in ${formatDistanceToNow(endDate)}`}
          {status === "finished" && `Finished ${formatDistanceToNow(endDate)} ago`}
           {status === "upcoming" && startDate <= new Date() && `Starting soon`} {/* Edge case for past start but not yet 'ongoing' based on exact now */}
           {status === "ongoing" && endDate <= new Date() && `Ending soon`}  {/* Edge case for past end but not yet 'finished' */}

        </p>
      </CardFooter>
    </Card>
  );
};

export default RaceCard;