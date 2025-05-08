import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  Clock,
  Trophy,
  Users,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface Segment {
  id: string;
  name: string;
  distance: number;
  elevation: number;
  url: string;
}

interface Participant {
  id: string;
  name: string;
  profileImage: string;
  hasSubmitted: boolean;
  totalTime?: number;
  segmentTimes?: Record<string, number>;
  age?: number;
  sex?: "male" | "female" | "other";
}

interface RaceDetails {
  id: string;
  name: string;
  organizer: {
    id: string;
    name: string;
    profileImage: string;
  };
  startDate: string;
  endDate: string;
  status: "not_started" | "ongoing" | "submissions_closed" | "finished";
  segments: Segment[];
  participants: Participant[];
  isOrganizer: boolean;
  hasSubmitted: boolean;
  submittedActivity?: {
    id: string;
    name: string;
    date: string;
    url: string;
  };
  joinRequests?: {
    id: string;
    name: string;
    profileImage: string;
  }[];
  categories?: {
    useAgeCategories: boolean;
    useSexCategories: boolean;
    ageRanges?: { min: number; max: number; label: string }[];
  };
}

const RaceDetail: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const [race, setRace] = useState<RaceDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
  const [selectedAgeCategory, setSelectedAgeCategory] = useState<string | null>(
    null,
  );
  const [selectedSexCategory, setSelectedSexCategory] = useState<string | null>(
    null,
  );

  // Mock data for UI scaffolding
  React.useEffect(() => {
    // This would be replaced with an actual API call
    setTimeout(() => {
      setRace({
        id: raceId || "1",
        name: "Weekend Mountain Challenge",
        organizer: {
          id: "123",
          name: "Jane Smith",
          profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
        },
        startDate: "2023-06-15T00:00:00Z",
        endDate: "2023-06-18T23:59:59Z",
        status: "ongoing",
        segments: [
          {
            id: "1234567",
            name: "Mountain Peak Climb",
            distance: 5.2,
            elevation: 320,
            url: "https://www.strava.com/segments/1234567",
          },
          {
            id: "7654321",
            name: "Forest Descent",
            distance: 3.8,
            elevation: -210,
            url: "https://www.strava.com/segments/7654321",
          },
          {
            id: "9876543",
            name: "Riverside Sprint",
            distance: 2.1,
            elevation: 15,
            url: "https://www.strava.com/segments/9876543",
          },
        ],
        participants: [
          {
            id: "123",
            name: "Jane Smith",
            profileImage:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=jane",
            hasSubmitted: true,
            totalTime: 1845,
            segmentTimes: {
              "1234567": 1200,
              "7654321": 450,
              "9876543": 195,
            },
            age: 28,
            sex: "female",
          },
          {
            id: "456",
            name: "John Doe",
            profileImage:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=john",
            hasSubmitted: true,
            totalTime: 1920,
            segmentTimes: {
              "1234567": 1250,
              "7654321": 470,
              "9876543": 200,
            },
            age: 35,
            sex: "male",
          },
          {
            id: "789",
            name: "Alex Johnson",
            profileImage:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=alex",
            hasSubmitted: false,
            age: 42,
            sex: "other",
          },
        ],
        isOrganizer: true,
        hasSubmitted: false,
        categories: {
          useAgeCategories: true,
          useSexCategories: true,
          ageRanges: [
            { min: 18, max: 29, label: "18-29" },
            { min: 30, max: 39, label: "30-39" },
            { min: 40, max: 49, label: "40-49" },
            { min: 50, max: 59, label: "50-59" },
            { min: 60, max: 100, label: "60+" },
          ],
        },
        joinRequests: [
          {
            id: "101",
            name: "Mike Wilson",
            profileImage:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=mike",
          },
          {
            id: "102",
            name: "Sarah Lee",
            profileImage:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
          },
        ],
      });
      setLoading(false);
    }, 1000);
  }, [raceId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "not_started":
        return <Badge variant="secondary">Not Started</Badge>;
      case "ongoing":
        return <Badge variant="default">Submissions Open</Badge>;
      case "submissions_closed":
        return <Badge>Submissions Closed</Badge>;
      case "finished":
        return <Badge variant="outline">Finished</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading race details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2" size={20} />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Race Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              The race you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.history.back()}>Go Back</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 bg-background">
      {/* Race Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{race.name}</h1>
            <div className="flex items-center mt-2 text-muted-foreground">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage
                  src={race.organizer.profileImage}
                  alt={race.organizer.name}
                />
                <AvatarFallback>{race.organizer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>Organized by {race.organizer.name}</span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:items-end">
            <div className="flex items-center">
              {getStatusBadge(race.status)}
              <span className="ml-2 text-muted-foreground">
                {race.status === "finished"
                  ? "Ended"
                  : race.status === "not_started"
                    ? "Starts"
                    : "Ends"}{" "}
                {formatDate(
                  race.status === "not_started" ? race.startDate : race.endDate,
                )}
              </span>
            </div>
            <div className="flex items-center mt-2">
              <Users size={16} className="mr-1 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {race.participants.length} participants
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {race.status === "ongoing" && !race.hasSubmitted && (
          <Button onClick={() => setSubmitDialogOpen(true)}>
            Submit Activity
          </Button>
        )}
        {race.status === "ongoing" && race.hasSubmitted && (
          <Button variant="outline" onClick={() => setSubmitDialogOpen(true)}>
            Update Submission
          </Button>
        )}
        {race.isOrganizer &&
          race.joinRequests &&
          race.joinRequests.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  Join Requests ({race.joinRequests.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Join Requests</AlertDialogTitle>
                  <AlertDialogDescription>
                    Approve or deny requests to join this race.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  {race.joinRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage
                            src={request.profileImage}
                            alt={request.name}
                          />
                          <AvatarFallback>
                            {request.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{request.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Deny
                        </Button>
                        <Button size="sm">Approve</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Close</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Race Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Calendar className="mr-2 text-muted-foreground" size={18} />
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-muted-foreground">
                      {formatDate(race.startDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="mr-2 text-muted-foreground" size={18} />
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-muted-foreground">
                      {formatDate(race.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Trophy className="mr-2 text-muted-foreground" size={18} />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-muted-foreground">
                      {getStatusBadge(race.status)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 text-muted-foreground" size={18} />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-muted-foreground">
                      {race.participants.length} cyclists
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segments Overview</CardTitle>
              <CardDescription>
                This race includes {race.segments.length} segments totaling{" "}
                {race.segments
                  .reduce((acc, segment) => acc + segment.distance, 0)
                  .toFixed(1)}{" "}
                km
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {race.segments.map((segment) => (
                  <div
                    key={segment.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div>
                      <p className="font-medium">{segment.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {segment.distance} km •{" "}
                        {segment.elevation > 0 ? "+" : ""}
                        {segment.elevation} m
                      </p>
                    </div>
                    <a
                      href={segment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center"
                    >
                      <span className="mr-1 text-sm">View on Strava</span>
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {race.status === "ongoing" && (
            <Card>
              <CardHeader>
                <CardTitle>Your Submission</CardTitle>
              </CardHeader>
              <CardContent>
                {race.hasSubmitted ? (
                  <div>
                    <p>You've submitted your activity:</p>
                    <div className="mt-2 p-3 border rounded-md">
                      <p className="font-medium">
                        {race.submittedActivity?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(race.submittedActivity?.date || "")}
                      </p>
                      <a
                        href={race.submittedActivity?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center mt-2"
                      >
                        <span className="mr-1 text-sm">View on Strava</span>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">
                      You haven't submitted an activity yet
                    </p>
                    <Button onClick={() => setSubmitDialogOpen(true)}>
                      Submit Activity
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Race Segments</CardTitle>
              <CardDescription>
                Complete all segments during the race period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Elevation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {race.segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell className="font-medium">
                        {segment.name}
                      </TableCell>
                      <TableCell>{segment.distance} km</TableCell>
                      <TableCell>
                        {segment.elevation > 0 ? "+" : ""}
                        {segment.elevation} m
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={segment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center justify-end"
                        >
                          <span className="mr-1">View on Strava</span>
                          <ExternalLink size={14} />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Participants Tab */}
        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
              <CardDescription>
                {race.participants.length} cyclists in this race
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {race.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 border rounded-md"
                  >
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage
                          src={participant.profileImage}
                          alt={participant.name}
                        />
                        <AvatarFallback>
                          {participant.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {participant.hasSubmitted
                            ? "Submitted activity"
                            : "No submission yet"}
                        </p>
                      </div>
                    </div>
                    {participant.hasSubmitted && participant.totalTime && (
                      <div className="text-right">
                        <p className="font-medium">
                          {formatTime(participant.totalTime)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Total Time
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                {race.status === "finished"
                  ? "Final results"
                  : "Current standings based on submitted activities"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Category Filters */}
              {(race.categories?.useAgeCategories ||
                race.categories?.useSexCategories) && (
                <div className="flex flex-wrap gap-3 mb-4 items-center">
                  <span className="text-sm font-medium">Filter by:</span>

                  {race.categories?.useAgeCategories && (
                    <div className="flex items-center">
                      <select
                        className="text-sm border rounded-md px-2 py-1"
                        value={selectedAgeCategory || ""}
                        onChange={(e) =>
                          setSelectedAgeCategory(e.target.value || null)
                        }
                      >
                        <option value="">All Ages</option>
                        {race.categories.ageRanges?.map((range) => (
                          <option key={range.label} value={range.label}>
                            {range.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {race.categories?.useSexCategories && (
                    <div className="flex items-center">
                      <select
                        className="text-sm border rounded-md px-2 py-1"
                        value={selectedSexCategory || ""}
                        onChange={(e) =>
                          setSelectedSexCategory(e.target.value || null)
                        }
                      >
                        <option value="">All</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  )}

                  {(selectedAgeCategory || selectedSexCategory) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAgeCategory(null);
                        setSelectedSexCategory(null);
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              )}
              {race.participants.filter((p) => p.hasSubmitted).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Rider</TableHead>
                      {race.categories?.useAgeCategories && (
                        <TableHead>Age</TableHead>
                      )}
                      {race.categories?.useSexCategories && (
                        <TableHead>Sex</TableHead>
                      )}
                      {race.segments.map((segment) => (
                        <TableHead key={segment.id}>
                          {segment.name}{" "}
                          <span className="text-xs block">Time (Pos)</span>
                        </TableHead>
                      ))}
                      <TableHead>Total Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {race.participants
                      .filter((p) => p.hasSubmitted && p.totalTime)
                      .filter((p) => {
                        // Filter by age category if selected
                        if (selectedAgeCategory && p.age) {
                          const ageRange = race.categories?.ageRanges?.find(
                            (range) => range.label === selectedAgeCategory,
                          );
                          if (
                            ageRange &&
                            (p.age < ageRange.min || p.age > ageRange.max)
                          ) {
                            return false;
                          }
                        }
                        // Filter by sex category if selected
                        if (
                          selectedSexCategory &&
                          p.sex !== selectedSexCategory
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .sort((a, b) => (a.totalTime || 0) - (b.totalTime || 0))
                      .map((participant, index) => {
                        // Calculate segment positions for this participant
                        const segmentPositions: Record<string, number> = {};

                        race.segments.forEach((segment) => {
                          if (
                            participant.segmentTimes &&
                            participant.segmentTimes[segment.id]
                          ) {
                            // Find position for this segment
                            const position =
                              race.participants
                                .filter(
                                  (p) =>
                                    p.hasSubmitted &&
                                    p.segmentTimes &&
                                    p.segmentTimes[segment.id],
                                )
                                .sort((a, b) => {
                                  return (
                                    (a.segmentTimes?.[segment.id] || 0) -
                                    (b.segmentTimes?.[segment.id] || 0)
                                  );
                                })
                                .findIndex((p) => p.id === participant.id) + 1;

                            segmentPositions[segment.id] = position;
                          }
                        });

                        return (
                          <TableRow key={participant.id}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <Avatar className="h-6 w-6 mr-2">
                                  <AvatarImage
                                    src={participant.profileImage}
                                    alt={participant.name}
                                  />
                                  <AvatarFallback>
                                    {participant.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{participant.name}</span>
                              </div>
                            </TableCell>
                            {race.categories?.useAgeCategories && (
                              <TableCell>{participant.age || "-"}</TableCell>
                            )}
                            {race.categories?.useSexCategories && (
                              <TableCell className="capitalize">
                                {participant.sex || "-"}
                              </TableCell>
                            )}
                            {race.segments.map((segment) => (
                              <TableCell key={segment.id}>
                                {participant.segmentTimes &&
                                participant.segmentTimes[segment.id] ? (
                                  <>
                                    {formatTime(
                                      participant.segmentTimes[segment.id],
                                    )}
                                    <span className="text-xs text-muted-foreground ml-1">
                                      (#{segmentPositions[segment.id]})
                                    </span>
                                  </>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="font-medium">
                              {participant.totalTime
                                ? formatTime(participant.totalTime)
                                : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">
                    No activities submitted yet
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Submit Activity Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Strava Activity</DialogTitle>
            <DialogDescription>
              Select a Strava activity that includes the race segments
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-4">
              This is a placeholder for the Strava activity selection interface.
              In a real implementation, this would connect to the Strava API to
              fetch and display the user's recent activities.
            </p>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">Morning Ride {i}</p>
                    <p className="text-sm text-muted-foreground">
                      June 1{i}, 2023 • 25.{i} km
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogDescription className="text-xs">
              Only activities during the race period will be valid
            </DialogDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaceDetail;
