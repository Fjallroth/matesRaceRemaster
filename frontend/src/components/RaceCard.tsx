import React from "react";
import { format, formatDistanceToNow } from "date-fns";
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

// Update Organizer type to match backend data structure used in home.tsx
interface Organizer {
    stravaId: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string; // Renamed from avatarUrl
}

// Define props for the RaceCard component
interface RaceCardProps {
  id: string;
  name: string;
  status: "upcoming" | "ongoing" | "finished";
  startDate: Date;
  endDate: Date;
  participantCount: number;
  organizer: Organizer; // Use the updated Organizer type
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
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500 text-white">Upcoming</Badge>;
      case "ongoing":
        return <Badge className="bg-green-500 text-white">Ongoing</Badge>;
      case "finished":
        return <Badge className="bg-gray-500 text-white">Finished</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Format organizer name - show first name, or full name if available
  const organizerName = organizer.firstName
    ? `${organizer.firstName}${organizer.lastName ? ` ${organizer.lastName}` : ''}`
    : `User ${organizer.stravaId}`; // Fallback if name isn't available

  // Get initials for Avatar fallback
  const getInitials = (firstName?: string, lastName?: string): string => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    return (firstInitial + lastInitial) || 'MR'; // Default to MR if no names
  }

  return (
    <Card
      className="hover:shadow-md transition-shadow duration-200 cursor-pointer flex flex-col h-full" // Added flex flex-col h-full for consistent height
      onClick={() => onClick(id)}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-lg font-semibold leading-tight">{name}</CardTitle>
             {/* Status and Privacy Badges */}
             <div className="flex flex-col items-end flex-shrink-0 space-y-1">
                {getStatusBadge()}
                {isPrivate && (
                    <Badge variant="outline" className="border-orange-500 text-orange-600">
                    <Lock className="h-3 w-3 mr-1" /> Private
                    </Badge>
                )}
            </div>
        </div>
        <CardDescription>
             {/* Organizer Info */}
            <div className="flex items-center text-xs text-gray-500 mt-1">
                 <Avatar className="h-4 w-4 mr-1.5">
                    {/* Use profilePicture for avatar */}
                    <AvatarImage src={organizer.profilePicture} alt={organizerName} />
                    <AvatarFallback className="text-[8px]">{getInitials(organizer.firstName, organizer.lastName)}</AvatarFallback>
                </Avatar>
                Organized by {organizerName}
            </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pb-4"> {/* Added flex-grow */}
        <div className="space-y-2">
            {/* Dates */}
            <div className="flex items-center text-sm text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                 <span>{format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}</span>
            </div>
             {/* Participants */}
            <div className="flex items-center text-sm text-gray-600">
                <Users className="h-4 w-4 mr-2 text-gray-400" />
                <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
            </div>
        </div>
      </CardContent>
      <CardFooter className="pt-3 pb-4">
         <p className="text-xs text-gray-400">
          {status === 'upcoming' && `Starts in ${formatDistanceToNow(startDate)}`}
          {status === 'ongoing' && `Ends in ${formatDistanceToNow(endDate)}`}
          {status === 'finished' && `Finished ${formatDistanceToNow(endDate)} ago`}
        </p>
      </CardFooter>
    </Card>
  );
};

export default RaceCard;