// src/pages/RaceDetail.tsx
import React, { useState, useEffect, useCallback } from "react";
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
import { Race, RaceOrganiser, RaceParticipant, StravaActivity, ParticipantSegmentResult } from "@/types/raceTypes"; // Updated imports
import { useAuth } from "@/AuthContext";
import { useToast } from "@/components/ui/use-toast"; // For showing messages


// Updated DisplayParticipantFromRace to use new types and improve derivation
interface DisplayParticipantFromRace extends RaceParticipant {
  name: string;
  totalTime?: number;
  segmentTimes?: Record<string, number>;
  profileImage?: string; // From user.userStravaPic
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
  const { toast } = useToast(); // For displaying notifications

  const [race, setRace] = useState<Race | null>(null);
  const [displaySegments, setDisplaySegments] = useState<DisplaySegment[]>([]);
  const [leaderboardParticipants, setLeaderboardParticipants] = useState<DisplayParticipantFromRace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for Submit Activity Dialog
  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState<boolean>(false);
  const [activityFetchError, setActivityFetchError] = useState<string | null>(null);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState<boolean>(false);
  const [activitySubmissionError, setActivitySubmissionError] = useState<string | null>(null);


  const mapParticipantsForDisplay = useCallback((participants?: RaceParticipant[]): DisplayParticipantFromRace[] => {
    if (!participants) return [];
    return participants.map((p) => {
      const user = p.user;
      let totalTimeSecs: number | undefined = undefined;
      const segTimes: Record<string, number> = {};

      if (p.segmentResults && p.segmentResults.length > 0) {
        totalTimeSecs = 0;
        p.segmentResults.forEach(sr => {
          if (sr.segmentId && sr.elapsedTimeSeconds !== undefined && sr.elapsedTimeSeconds !== null) {
            segTimes[sr.segmentId.toString()] = sr.elapsedTimeSeconds;
            totalTimeSecs += sr.elapsedTimeSeconds;
          }
        });
        // If all segments have null/undefined time, totalTime remains undefined
        if (totalTimeSecs !== undefined && Object.keys(segTimes).length === 0 && (race?.segmentIds?.length || 0) > 0) {
            totalTimeSecs = undefined; // No valid segment efforts found
        } else if (totalTimeSecs === 0 && (race?.segmentIds?.length || 0) > 0 && Object.keys(segTimes).length === 0) {
            // Case where total is 0 because no segmentResults had time, but there are race segments.
            totalTimeSecs = undefined;
        }
      }

      return {
        ...p,
        name: `${user.userStravaFirstName || ''} ${user.userStravaLastName || ''}`.trim() || user.displayName || `User ${user.stravaId}`,
        profileImage: user.userStravaPic,
        totalTime: totalTimeSecs,
        segmentTimes: segTimes,
      };
    });
  }, [race?.segmentIds]); // Add race.segmentIds as dependency

  const fetchRaceDetails = useCallback(async () => { // Wrapped in useCallback
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

      const segmentDetailsPromises = data.segmentIds.map(async (id) => {
          // In a real app, you might fetch segment names from Strava via your backend here
          // For now, use placeholder name.
          // The segment names should ideally come from the backend if they are pre-fetched
          // or use segment name from p.segmentResults when available for the leaderboard.
          let segmentName = `Segment ${id}`;
          // Attempt to find the segment name from the first participant who has this segment
          const participantWithSegment = data.participants?.find(par => par.segmentResults?.find(sr => sr.segmentId === id && sr.segmentName));
          if (participantWithSegment) {
              const foundSegmentResult = participantWithSegment.segmentResults?.find(sr => sr.segmentId === id && sr.segmentName);
              if (foundSegmentResult && foundSegmentResult.segmentName) {
                segmentName = foundSegmentResult.segmentName;
              }
          }

          return {
              id: id,
              name: segmentName,
              url: `https://www.strava.com/segments/${id}`,
          };
      });
      const detailedSegments = await Promise.all(segmentDetailsPromises);
      setDisplaySegments(detailedSegments);

      setLeaderboardParticipants(mapParticipantsForDisplay(data.participants));

    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching race details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [raceId, navigate, mapParticipantsForDisplay]); // Added mapParticipantsForDisplay

  useEffect(() => {
    if (isAuthenticated) {
        fetchRaceDetails();
    } else if (isAuthenticated === false && !isLoading) { // Avoid redirect during initial auth load
        navigate('/login');
    }
  }, [isAuthenticated, isLoading, fetchRaceDetails, navigate]); // Added fetchRaceDetails

  // Function to fetch Strava activities for the dialog
  const fetchUserStravaActivities = async () => {
    if (!raceId || !race) { // Check if race object is loaded
        setActivityFetchError("Race details not available to fetch activities.");
        return;
    }
    setIsFetchingActivities(true);
    setActivityFetchError(null);
    setStravaActivities([]);
    try {
        const response = await fetch(`/api/races/${raceId}/strava-activities`, {
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}`}));
            throw new Error(errorData.message || `Failed to fetch Strava activities: ${response.statusText}`);
        }
        const activities: StravaActivity[] = await response.json();
        setStravaActivities(activities);
        if (activities.length === 0) {
            setActivityFetchError("No recent Strava 'Ride' activities found within the race period.");
        }
    } catch (err: any) {
        console.error("Error fetching Strava activities:", err);
        setActivityFetchError(err.message || "Could not fetch activities.");
    } finally {
        setIsFetchingActivities(false);
    }
  };

  // Function to submit the selected activity
  const handleActivitySubmit = async (activityId: number) => {
    if (!raceId) return;
    setIsSubmittingActivity(true);
    setActivitySubmissionError(null);
    try {
        const response = await fetch(`/api/races/${raceId}/submit-activity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ activityId }),
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}`}));
            throw new Error(errorData.message || `Failed to submit activity: ${response.statusText}`);
        }
        toast({ title: "Success!", description: "Your activity has been submitted." });
        setSubmitDialogOpen(false);
        fetchRaceDetails(); // Refresh race details to update leaderboard and submission status
    } catch (err: any) {
        console.error("Error submitting activity:", err);
        setActivitySubmissionError(err.message || "Could not submit activity.");
        toast({ variant: "destructive", title: "Submission Error", description: err.message || "Could not submit activity." });
    } finally {
        setIsSubmittingActivity(false);
    }
  };

  // Open dialog and fetch activities
  useEffect(() => {
    if (submitDialogOpen && raceId && race?.startDate && race?.endDate) {
      
      if (!isFetchingActivities && stravaActivities.length === 0) {
        fetchUserStravaActivities();
      }
    } else if (!submitDialogOpen) {

      setStravaActivities([]);
      setActivityFetchError(null);
    }

  }, [submitDialogOpen, raceId, race?.startDate, race?.endDate, isFetchingActivities]); 
 
  const formatTime = (seconds?: number): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) {
      return "N/A";
    }
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) {
        return "Invalid Date";
      }
      return format(date, "MMM d, yyyy");
    } catch (e) {
      return "Date Error";
    }
  };

  const getRaceStatus = (startDate?: string, endDate?: string): "not_started" | "ongoing" | "finished" => {
    if (!startDate || !endDate) return "not_started"; // Default if dates are missing
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start) || !isValid(end)) return "not_started"; // Invalid dates

    if (now < start) return "not_started";
    if (now >= start && now <= end) return "ongoing";
    return "finished";
  };

  const getStatusBadge = (status: string) => {
    if (status === "not_started") return <Badge variant="secondary">Not Started</Badge>;
    if (status === "ongoing") return <Badge className="bg-green-500 text-white hover:bg-green-600">Submissions Open</Badge>;
    if (status === "finished") return <Badge variant="outline" className="bg-gray-500 text-white">Finished</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const isOrganizer = race?.organiser?.stravaId?.toString() === currentUser?.stravaId;
  const currentUserParticipant = leaderboardParticipants.find(p => p.user.stravaId.toString() === currentUser?.stravaId);
  const hasSubmitted = currentUserParticipant?.submittedRide || false;


  if (isLoading && !race) {
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
            <Button onClick={() => fetchRaceDetails()} className="mr-2">Try Again</Button>
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
                {race.participantCount || 0} participant(s)
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
                      {race.participantCount || 0} cyclist(s)
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
                    <p>You've submitted your activity (ID: {currentUserParticipant?.submittedActivityId || "N/A"}).</p>
                    <p>You can update it by clicking the "Update Submission" button.</p>
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
                      <TableHead className="text-right">View on Strava</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displaySegments.map((segment) => (
                      <TableRow key={segment.id}>
                        <TableCell className="font-medium">{segment.name}</TableCell>
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
                          <AvatarImage src={participant.profileImage} alt={participant.name} />
                          <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {participant.submittedRide ? `Submitted (Activity ID: ${participant.submittedActivityId || 'N/A'})` : "No submission yet"}
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
              {leaderboardParticipants.filter((p) => p.submittedRide && p.totalTime !== undefined).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Rider</TableHead>
                      {displaySegments.map(segment => (
                          <TableHead key={segment.id} className="text-xs whitespace-nowrap">
                            {segment.name.length > 25 ? segment.name.substring(0,22) + "..." : segment.name}
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
                                <AvatarImage src={participant.profileImage} alt={participant.name} />
                                <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                              </Avatar>
                              <span className="whitespace-nowrap">{participant.name}</span>
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
        <DialogContent className="sm:max-w-lg"> {/* Increased width slightly */}
          <DialogHeader>
            <DialogTitle>Submit Strava Activity</DialogTitle>
            <DialogDescription>
              Select a Strava 'Ride' activity completed between {race?.startDate ? formatDate(race.startDate) : 'N/A'} and {race?.endDate ? formatDate(race.endDate) : 'N/A'}.
              <br/> Segment times will be automatically extracted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {isFetchingActivities && (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
                <p className="ml-2">Fetching your recent Strava activities...</p>
              </div>
            )}
            {!isFetchingActivities && activityFetchError && (
              <p className="text-center text-destructive px-2 py-4 border border-destructive/50 rounded-md bg-destructive/10">{activityFetchError}</p>
            )}
            {!isFetchingActivities && !activityFetchError && stravaActivities.length === 0 && (
              <p className="text-center text-muted-foreground p-6">
                No recent Strava 'Ride' activities found within the race period. Ensure your activity is set to 'Ride' type on Strava.
              </p>
            )}
            {!isFetchingActivities && stravaActivities.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto border rounded-md p-1"> {/* Increased max-h and added padding */}
                {stravaActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`flex items-center justify-between p-3 border rounded-md cursor-pointer hover:bg-accent ${isSubmittingActivity ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !isSubmittingActivity && handleActivitySubmit(activity.id)}
                    role="button"
                    tabIndex={isSubmittingActivity ? -1 : 0}
                    onKeyDown={(e) => e.key === 'Enter' && !isSubmittingActivity && handleActivitySubmit(activity.id)}
                  >
                    <div>
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(parseISO(activity.startDateLocal), "MMM d, yyyy h:mm a")} • {(activity.distance / 1000).toFixed(1)} km • {formatTime(activity.elapsedTime)}
                      </p>
                    </div>
                    {!isSubmittingActivity && <ChevronRight size={18} className="text-muted-foreground" />}
                    {isSubmittingActivity && <Loader2 size={18} className="text-muted-foreground animate-spin" />}
                  </div>
                ))}
              </div>
            )}
            {activitySubmissionError && (
                <p className="text-sm text-destructive pt-2 text-center">{activitySubmissionError}</p>
            )}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button type="button" variant="outline" onClick={() => setSubmitDialogOpen(false)} disabled={isSubmittingActivity}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaceDetail;