// src/pages/RaceDetail.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Trophy,
  Users,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Loader2,
  Settings,
  Info,
  ListChecks,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Race, RaceOrganiser, RaceParticipant } from "@/types/raceTypes"; // Correctly import RaceParticipant
import { useAuth } from "@/AuthContext";

// Simplified DisplayParticipant for the leaderboard, using RaceParticipant as base
interface DisplayParticipantFromRace extends RaceParticipant {
  name: string; // Derived name for display
  totalTime?: number; // in seconds, calculated
  segmentTimes?: Record<string, number>; // segmentId: timeInSeconds, calculated
}

interface DisplaySegment {
    id: number;
    name: string;
    url: string;
    distance?: number;
    elevation?: number;
}


const RaceDetail: React.FC = () => {
  const { raceId } = useParams<{ raceId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();

  const [race, setRace] = useState<Race | null>(null);
  const [displaySegments, setDisplaySegments] = useState<DisplaySegment[]>([]);
  const [leaderboardParticipants, setLeaderboardParticipants] = useState<DisplayParticipantFromRace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchRaceDetails = async () => {
      if (!raceId) {
        setError("Race ID is missing.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/races/${raceId}`, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) navigate('/login');
          if (response.status === 404) throw new Error("Race not found.");
          throw new Error(`Failed to fetch race details: ${response.statusText}`);
        }
        const data: Race = await response.json();
        setRace(data);

        // Process segments (assuming segment details might need separate fetching or come enriched)
        const segmentDetailsPromises = data.segmentIds.map(async (id) => {
            // Placeholder: fetch segment name, distance, elevation from Strava API via your backend
            return {
                id: id,
                name: `Segment ${id}`, // Replace with actual fetched name
                url: `https://www.strava.com/segments/${id}`,
                // distance: fetchedDistance,
                // elevation: fetchedElevation,
            };
        });
        const detailedSegments = await Promise.all(segmentDetailsPromises);
        setDisplaySegments(detailedSegments);

        // Process participants if they are included in the Race response
        if (data.participants) {
            const mappedParticipants = data.participants.map((p: RaceParticipant) => {
                const user = p.user;
                // Dummy calculation for totalTime and segmentTimes
                // In a real scenario, this data would come from p.segmentResults or be calculated
                // based on actual submitted activity processing.
                // const totalTime = p.segmentResults?.reduce((sum, sr) => sum + (sr.elapsedTimeSeconds || 0), 0) || undefined;
                // const segmentTimes = p.segmentResults?.reduce((acc, sr) => {
                //     if (sr.segmentId && sr.elapsedTimeSeconds) acc[sr.segmentId.toString()] = sr.elapsedTimeSeconds;
                //     return acc;
                // }, {});

                return {
                    ...p, // Spread the original participant data
                    name: `${user.userStravaFirstName || ''} ${user.userStravaLastName || ''}`.trim() || user.displayName || `User ${user.stravaId}`,
                    profileImage: user.userStravaPic,
                    // totalTime: totalTime, // Replace with actual data
                    // segmentTimes: segmentTimes, // Replace with actual data
                };
            });
            setLeaderboardParticipants(mappedParticipants);
        }


      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching race details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
        fetchRaceDetails();
    } else if (isAuthenticated === false && !isLoading) { // Avoid redirect during initial auth load
        navigate('/login');
    }
  }, [raceId, navigate, isAuthenticated, isLoading]); // Added isLoading to dependencies

  const formatTime = (seconds?: number): string => {
    if (seconds === undefined || seconds === null) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      console.warn("formatDate called with undefined or null dateString");
      return "N/A";
    }
  
    try {
      const date = parseISO(dateString);
  
      if (!isValid(date)) {
        console.error("formatDate: Invalid date produced by parseISO for input:", dateString);
        return "Invalid Date";
      }
  
      // Let's try a different, very common and simple format string for diagnostics
      const formatPattern = "yyyy-MM-dd"; // Changed from "MMM d, yyyy"
      // You can also try "PP" (e.g., 05/12/2025) or "MMM d, yy"
  
      console.log("Attempting to format date:", date, "with pattern:", formatPattern, "from input:", dateString);
      return format(date, formatPattern);
  
    } catch (e) {
      console.error("Error caught during date formatting for input:", dateString, e);
      return "Date Error";
    }
  };

  const getRaceStatus = (startDate?: string, endDate?: string): "not_started" | "ongoing" | "submissions_closed" | "finished" => {
    if (!startDate || !endDate) return "not_started";
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (now < start) return "not_started";
    if (now >= start && now <= end) return "ongoing";
    return "finished";
  };

  const getStatusBadge = (status: string) => {
    if (status === "not_started") return <Badge variant="secondary">Not Started</Badge>;
    if (status === "ongoing") return <Badge className="bg-green-500 text-white">Submissions Open</Badge>;
    if (status === "finished") return <Badge variant="outline" className="bg-gray-500 text-white">Finished</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const isOrganizer = race?.organiser?.stravaId?.toString() === currentUser?.stravaId;
  // Determine if current user has submitted based on fetched participant data
  const currentUserParticipant = race?.participants?.find(p => p.user.stravaId.toString() === currentUser?.stravaId);
  const hasSubmitted = currentUserParticipant?.submittedRide || false;


  if (isLoading && !race) { // Show loading only if race data isn't available yet
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
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
          <CardContent><p>{error}</p></CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="mr-2">Try Again</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Race Not Found</CardTitle></CardHeader>
          <CardContent><p>The race (ID: {raceId}) might not exist or you may not have permission.</p></CardContent>
          <CardFooter><Button onClick={() => navigate('/')}>Go Home</Button></CardFooter>
        </Card>
      </div>
    );
  }

  const currentStatus = getRaceStatus(race.startDate, race.endDate);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 bg-background">
      {/* Race Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{race.raceName}</h1>
            <div className="flex items-center mt-2 text-muted-foreground">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage
                  src={race.organiser.userStravaPic}
                  alt={race.organiser.userStravaFirstName || race.organiser.stravaId.toString()}
                />
                <AvatarFallback>{(race.organiser.userStravaFirstName || 'U')[0]}</AvatarFallback>
              </Avatar>
              <span>
                Organized by {race.organiser.userStravaFirstName || race.organiser.displayName || `User ${race.organiser.stravaId}`}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:items-end">
            <div className="flex items-center">
              {getStatusBadge(currentStatus)}
              <span className="ml-2 text-muted-foreground text-sm">
                {currentStatus === "finished"
                  ? "Ended"
                  : currentStatus === "not_started"
                    ? "Starts"
                    : "Ends"}{" "}
                {formatDate(
                  currentStatus === "not_started" ? race.startDate : race.endDate,
                )}
              </span>
            </div>
            <div className="flex items-center mt-1">
              <Users size={14} className="mr-1 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {race.participants?.length || 0} participant(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" onClick={() => navigate("/my-races")}>
          Back to My Races
        </Button>
        {currentStatus === "ongoing" && !hasSubmitted && isAuthenticated && (
          <Button onClick={() => setSubmitDialogOpen(true)}>
            Submit Activity
          </Button>
        )}
        {currentStatus === "ongoing" && hasSubmitted && isAuthenticated && (
          <Button variant="outline" onClick={() => setSubmitDialogOpen(true)}>
            Update Submission
          </Button>
        )}
         {isOrganizer && (
            <Button variant="outline" onClick={() => alert("Manage Race Settings - Placeholder")}>
                <Settings className="mr-2 h-4 w-4" /> Manage Race
            </Button>
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

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Race Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {race.raceInfo && (
                <div className="flex items-start">
                    <Info className="mr-3 mt-1 text-muted-foreground flex-shrink-0" size={18} />
                    <div>
                        <p className="text-sm font-medium">Description</p>
                        <p className="text-muted-foreground whitespace-pre-wrap">{race.raceInfo}</p>
                    </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* ... other items ... */}
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
                    {getStatusBadge(currentStatus)}
                  </div>
                </div>
                <div className="flex items-center">
                  <Users className="mr-2 text-muted-foreground" size={18} />
                  <div>
                    <p className="text-sm font-medium">Participants</p>
                    <p className="text-muted-foreground">
                      {race.participants?.length || 0} cyclist(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                    <ListChecks className="mr-2 text-muted-foreground" size={18}/>
                    <div>
                        <p className="text-sm font-medium">Segments</p>
                        <p className="text-muted-foreground">{race.segmentIds.length} segment(s)</p>
                    </div>
                </div>
                 <div className="flex items-center">
                    <Users className="mr-2 text-muted-foreground" size={18}/> {/* Using Users icon for privacy - consider a Lock icon */}
                    <div>
                        <p className="text-sm font-medium">Privacy</p>
                        <p className="text-muted-foreground">{race.isPrivate ? "Private" : "Public"}</p>
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {currentStatus === "ongoing" && isAuthenticated && (
            <Card>
              <CardHeader><CardTitle>Your Submission</CardTitle></CardHeader>
              <CardContent>
                {hasSubmitted ? (
                  <div>
                    <p>You've submitted your activity.</p>
                    {/* TODO: Display submitted activity details if available from backend */}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-3">No activity submitted yet for this race.</p>
                    <Button onClick={() => setSubmitDialogOpen(true)}>Submit Strava Activity</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Race Segments</CardTitle>
              <CardDescription>Complete all listed Strava segments during the race period.</CardDescription>
            </CardHeader>
            <CardContent>
              {displaySegments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment Name</TableHead>
                      {/* <TableHead>Distance</TableHead> */}
                      {/* <TableHead>Elevation</TableHead> */}
                      <TableHead className="text-right">View on Strava</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displaySegments.map((segment) => (
                      <TableRow key={segment.id}>
                        <TableCell className="font-medium">{segment.name}</TableCell>
                        {/* <TableCell>{segment.distance?.toFixed(1) || '-'} km</TableCell> */}
                        {/* <TableCell>{segment.elevation ? `${segment.elevation > 0 ? '+' : ''}${segment.elevation}` : '-'} m</TableCell> */}
                        <TableCell className="text-right">
                          <a href={segment.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center justify-end">
                            <span className="mr-1 text-sm">View Segment</span>
                            <ExternalLink size={14} />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground p-4 text-center">No segments defined for this race.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader>
                <CardTitle>Participants</CardTitle>
                <CardDescription>{leaderboardParticipants.length} cyclist{leaderboardParticipants.length !== 1 ? 's' : ''} in this race.</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboardParticipants.length > 0 ? (
                <div className="space-y-4">
                  {leaderboardParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={participant.user.userStravaPic} alt={participant.name} />
                          <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participant.submittedRide ? "Submitted activity" : "No submission yet"}
                          </p>
                        </div>
                      </div>
                      {participant.submittedRide && participant.totalTime !== undefined && (
                        <div className="text-right">
                          <p className="font-medium">{formatTime(participant.totalTime)}</p>
                          <p className="text-sm text-muted-foreground">Total Time</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                 <p className="text-muted-foreground p-4 text-center">No participants have joined or been loaded for this race yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                {currentStatus === "finished" ? "Final results" : "Current standings (based on submitted valid activities)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboardParticipants.filter((p) => p.submittedRide).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Rider</TableHead>
                      {displaySegments.map(segment => (
                          <TableHead key={segment.id} className="text-xs">
                            {segment.name.length > 20 ? segment.name.substring(0,17) + "..." : segment.name}
                          </TableHead>
                      ))}
                      <TableHead>Total Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboardParticipants
                      .filter((p) => p.submittedRide && p.totalTime !== undefined)
                      .sort((a, b) => (a.totalTime || Infinity) - (b.totalTime || Infinity))
                      .map((participant, index) => (
                        <TableRow key={participant.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={participant.user.userStravaPic} alt={participant.name} />
                                <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                              </Avatar>
                              <span>{participant.name}</span>
                            </div>
                          </TableCell>
                           {displaySegments.map(segment => (
                              <TableCell key={`${participant.id}-${segment.id}`}>
                                {formatTime(participant.segmentTimes?.[segment.id.toString()])}
                              </TableCell>
                          ))}
                          <TableCell className="font-medium">
                            {formatTime(participant.totalTime)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">
                    No activities submitted yet. Leaderboard will populate once submissions are in.
                  </p>
                  {currentStatus === "ongoing" && !hasSubmitted && isAuthenticated && (
                    <Button onClick={() => setSubmitDialogOpen(true)}>Submit Your Activity</Button>
                  )}
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
            <DialogDescription>Select a Strava activity that includes the race segments completed during the race period.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center text-muted-foreground mb-4">Activity selection interface placeholder.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent"
                  onClick={() => { alert(`Activity "Recent Ride ${i}" selected. Implement submission logic.`); setSubmitDialogOpen(false); }}>
                  <div>
                    <p className="font-medium">Recent Ride {i}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(Date.now() - i * 24 * 3600 * 1000), "MMM d, yy")} • {(20 + i * 5).toFixed(1)} km</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaceDetail;