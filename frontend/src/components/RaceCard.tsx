import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Users, Trophy, Clock } from "lucide-react";
import { format } from "date-fns";

interface RaceCardProps {
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
  onClick?: (id: string) => void;
}

const RaceCard = ({
  id,
  name = "Sample Race",
  status = "upcoming",
  startDate = new Date(),
  endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  participantCount = 0,
  organizer = { id: "1", name: "Race Organizer" },
  isPrivate = false,
  onClick,
}: RaceCardProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500";
      case "ongoing":
        return "bg-green-500";
      case "finished":
        return "bg-gray-500";
      default:
        return "bg-blue-500";
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  return (
    <Card
      className="w-full max-w-[350px] h-[200px] overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer bg-white"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg line-clamp-1">{name}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge className={`${getStatusColor()} text-white capitalize`}>
              {status}
            </Badge>
            {isPrivate && (
              <Badge variant="outline" className="text-xs">
                Private
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{participantCount} participants</span>
        </div>

        {status === "ongoing" && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-amber-500 font-medium">
              Race in progress
            </span>
          </div>
        )}

        {status === "finished" && (
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Results available</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Organized by:</span>
          <div className="flex items-center gap-1">
            <Avatar className="h-5 w-5">
              <AvatarImage src={organizer.avatarUrl} alt={organizer.name} />
              <AvatarFallback>{organizer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{organizer.name}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default RaceCard;
