import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  DialogClose
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
  Trash2,
  Edit3,
  Crown,
  AlertTriangle
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { Race, RaceOrganiser, RaceParticipant, StravaActivity, ParticipantSegmentResult } from "@/types/raceTypes";
import { useAuth } from "@/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface DisplayParticipantFromRace extends RaceParticipant {
  name: string;
  totalTime?: number;
  segmentTimes?: Record<string, number>;
  profileImage?: string;
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
  const { user: currentUser, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [race, setRace] = useState<Race | null>(null);
  const [displaySegments, setDisplaySegments] = useState<DisplaySegment[]>([]);
  const [leaderboardParticipants, setLeaderboardParticipants] = useState<DisplayParticipantFromRace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
  const [stravaActivities, setStravaActivities] = useState<StravaActivity[]>([]);
  const [isFetchingActivities, setIsFetchingActivities] = useState<boolean>(false);
  const [activityFetchError, setActivityFetchError] = useState<string | null>(null);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState<boolean>(false);
  const [activitySubmissionError, setActivitySubmissionError] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const isOrganizer = race?.organiser?.stravaId?.toString() === currentUser?.stravaId;

  // mapParticipantsForDisplay definition
  const mapParticipantsForDisplay = useCallback((participants?: RaceParticipant[], segmentIdsParam?: number[]): DisplayParticipantFromRace[] => {
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
              totalTimeSecs! += sr.elapsedTimeSeconds;
            }
          });
          
          const currentRaceSegmentIds = segmentIdsParam || [];
          if (totalTimeSecs !== undefined && Object.keys(segTimes).length === 0 && currentRaceSegmentIds.length > 0) {
              totalTimeSecs = undefined;
          } else if (totalTimeSecs === 0 && currentRaceSegmentIds.length > 0 && Object.keys(segTimes).length === 0) {
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
    }, []); // Now mapParticipantsForDisplay is stable

  const fetchRaceDetails = useCallback(async () => {
    if (!raceId) {
      setError("Race ID is missing.");
      setIsLoading(false);
      return;
    }
    // Only proceed if authenticated and auth check is complete.
    if (!isAuthenticated || isAuthLoading) {
      if (!isAuthLoading && !isAuthenticated) {
        navigate('/login');
      }
      return;
    }

    console.log(`Workspaceing race details for raceId: ${raceId}`);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/races/${raceId}`, {
          headers: { 'Accept': 'application/json' },
          credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401 && !isAuthLoading) navigate('/login');
        if (response.status === 404) throw new Error("Race not found.");
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch race details: ${response.statusText}` }));
        throw new Error(errorData.message || `Failed to fetch race details: ${response.statusText}`);
      }
      const data: Race = await response.json();
      setRace(data);

      const segmentDetailsPromises = data.segmentIds.map(async (id) => {
          let segmentName = `Segment ${id}`;
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

      setLeaderboardParticipants(mapParticipantsForDisplay(data.participants, data.segmentIds));

    } catch (err: any) {
      setError(err.message);
      console.error("Error fetching race details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [raceId, navigate, isAuthenticated, isAuthLoading, mapParticipantsForDisplay]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        console.log("Authenticated, calling fetchRaceDetails");
        fetchRaceDetails();
      } else {
        console.log("Not authenticated, navigating to login");
        navigate('/login');
      }
    } else {
      console.log("Auth is loading, waiting...");
    }
  }, [isAuthenticated, isAuthLoading, raceId, navigate, fetchRaceDetails]);

  const fetchUserStravaActivities = async () => {
    if (!raceId || !race) {
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
            setActivityFetchError("No recent Strava 'Ride' activities found within the race period. Check activity type and date range.");
        }
    } catch (err: any) {
        console.error("Error fetching Strava activities:", err);
        setActivityFetchError(err.message || "Could not fetch activities.");
    } finally {
        setIsFetchingActivities(false);
    }
  };

  const handleActivitySubmit = async () => {
    if (!raceId || !selectedActivity) return;
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
            body: JSON.stringify({ activityId: Number(selectedActivity) }),
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ message: `HTTP error ${response.status}`}));
            throw new Error(errorData.message || `Failed to submit activity: ${response.statusText}`);
        }
        toast({ title: "Success!", description: "Your activity has been submitted." });
        setSubmitDialogOpen(false);
        setSelectedActivity(null);
        fetchRaceDetails(); // Re-fetch race details to update participant list/status
    } catch (err: any) {
        console.error("Error submitting activity:", err);
        setActivitySubmissionError(err.message || "Could not submit activity.");
        toast({ variant: "destructive", title: "Submission Error", description: err.message || "Could not submit activity." });
    } finally {
        setIsSubmittingActivity(false);
    }
  };
  
  const handleOpenSubmitRideDialog = () => {
    if (raceId && race?.startDate && race?.endDate) {
      fetchUserStravaActivities();
    }
    setSubmitDialogOpen(true);
  };

  const handleDeleteRace = async () => {
    if (!race || !race.id || !isOrganizer) return;

    try {
      const response = await fetch(`/api/races/${race.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Race Deleted",
          description: `${race.raceName} has been successfully deleted.`,
        });
        navigate('/my-races'); 
      } else {
        const errorData = await response.json().catch(() => ({ message: "Failed to delete race."}));
        throw new Error(errorData.message || "Failed to delete race.");
      }
    } catch (err: any) {
      toast({
        title: "Error Deleting Race",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteParticipant = async (participantId: number) => {
    console.log(`[DEL_PARTICIPANT] START - ID: ${participantId}, Timestamp: ${new Date().toISOString()}`);
    console.log("[DEL_PARTICIPANT] Current 'race' state at START:", JSON.stringify(race));
    console.log("[DEL_PARTICIPANT] 'isOrganizer' at START:", isOrganizer);
    console.log("[DEL_PARTICIPANT] 'currentUser' at START:", JSON.stringify(currentUser));
  
    if (!race || !race.id || !participantId || !isOrganizer) {
      console.error(`[DEL_PARTICIPANT] PRE-CONDITION FAILED. Race ID: ${race?.id}, Participant ID: ${participantId}, Is Organizer: ${isOrganizer}`);
      toast({
        title: "Cannot Remove Participant",
        description: "Pre-condition to remove participant not met. Race data might be missing or you might not be the organizer.",
        variant: "destructive",
      });
      return;
    }
    console.log("[DEL_PARTICIPANT] Pre-conditions PASSED.");
  
    try {
      console.log(`[DEL_PARTICIPANT] Attempting FETCH to /api/races/${race.id}/participants/${participantId}`);
      const response = await fetch(`/api/races/${race.id}/participants/${participantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      console.log(`[DEL_PARTICIPANT] FETCH completed. Status: ${response.status}, OK: ${response.ok}`);
  
      if (response.status === 204 || response.ok) {
        console.log("[DEL_PARTICIPANT] SUCCESS block entered.");
        toast({
          title: "Participant Removed",
          description: "The participant has been successfully removed from the race.",
        });
  
        setRace(prevRace => {
          console.log("[DEL_PARTICIPANT] setRace updater function called.");
          if (!prevRace) {
            console.error("[DEL_PARTICIPANT] ERROR in setRace: prevRace is null or undefined!");
            return null;
          }
          console.log("[DEL_PARTICIPANT] prevRace.participants before filter:", JSON.stringify(prevRace.participants));
          console.log("[DEL_PARTICIPANT] participantId to remove:", participantId);
  
          const updatedParticipants = prevRace.participants?.filter(p => p.id !== participantId) || [];
          console.log("[DEL_PARTICIPANT] updatedParticipants after filter:", JSON.stringify(updatedParticipants));
          
          // Use the stable mapParticipantsForDisplay with the updated participants and existing segment IDs from prevRace
          setLeaderboardParticipants(mapParticipantsForDisplay(updatedParticipants, prevRace.segmentIds));
          console.log("[DEL_PARTICIPANT] setLeaderboardParticipants called.");
          
          const newParticipantCount = updatedParticipants.length;
          console.log("[DEL_PARTICIPANT] New participant count:", newParticipantCount);
  
          return {
            ...prevRace,
            participants: updatedParticipants,
            participantCount: newParticipantCount,
          };
        });
        console.log("[DEL_PARTICIPANT] setRace called.");
      } else {
        const errorData = await response.json().catch(() => ({ message: `Failed to remove participant. Status: ${response.status}` }));
        console.error(`[DEL_PARTICIPANT] FETCH FAILED (else block). Status: ${response.status}, Error Data:`, errorData);
        toast({
          title: "Removal Failed",
          description: errorData.message || `Could not remove participant. Server responded with status ${response.status}.`,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("[DEL_PARTICIPANT] CATCH block error:", err);
      toast({
        title: "Error Removing Participant",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    console.log(`[DEL_PARTICIPANT] END - ID: ${participantId}, Timestamp: ${new Date().toISOString()}`);
  };
 
  const formatTime = (seconds?: number): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, "MMM d, yyyy h:mm a") : "Invalid Date";
    } catch (e) { return "Date Error"; }
  };

  const getRaceStatus = (startDate?: string, endDate?: string): "not_started" | "ongoing" | "finished" => {
    if (!startDate || !endDate) return "not_started";
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (!isValid(start) || !isValid(end)) return "not_started";
    if (now < start) return "not_started";
    if (now <= end) return "ongoing";
    return "finished";
  };

  const getStatusBadge = (status: "not_started" | "ongoing" | "finished") => {
    if (status === "not_started") return <Badge variant="secondary">Not Started</Badge>;
    if (status === "ongoing") return <Badge className="bg-green-500 text-white hover:bg-green-600">Ongoing</Badge>;
    if (status === "finished") return <Badge variant="outline" className="bg-gray-500 text-white">Finished</Badge>;
    return null;
  };

  const currentUserParticipant = leaderboardParticipants.find(p => p.user.stravaId.toString() === currentUser?.stravaId);
  const hasSubmitted = currentUserParticipant?.submittedRide || false;

  if (isAuthLoading || (isLoading && !race)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
        <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Race</h2>
        <p className="text-red-600 mb-6 text-center">{error}</p>
        <div className="flex gap-2">
            <Button onClick={() => fetchRaceDetails()} className="mr-2">Try Again</Button>
            <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen">
         <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
        <CardTitle className="text-2xl mb-2">Race Not Found</CardTitle>
        <CardDescription className="mb-6">The race you are looking for (ID: {raceId}) might not exist or you may not have permission to view it.</CardDescription>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  const currentStatus = getRaceStatus(race.startDate, race.endDate);

  return (
    <div className="container mx-auto py-6 px-4 md:px-6 bg-background">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">{race.raceName}</h1>
            <div className="flex items-center text-muted-foreground text-sm">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={race.organiser.userStravaPic || undefined} alt={race.organiser.displayName || 'Org'} />
                <AvatarFallback>{(race.organiser.displayName || 'O')[0]}</AvatarFallback>
              </Avatar>
              <span>Organized by {race.organiser.displayName || `User ${race.organiser.stravaId}`}</span>
              {race.isPrivate && <Badge variant="outline" className="ml-2 text-xs">Private</Badge>}
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:items-end space-y-1">
            <div className="flex items-center">
                {getStatusBadge(currentStatus)}
                <span className="ml-2 text-muted-foreground text-sm">
                    {formatDate(currentStatus === "not_started" ? race.startDate : race.endDate)}
                </span>
            </div>
             {isOrganizer && (
              <div className="flex space-x-2 mt-2">
                <Link to={`/edit-race/${race.id}`}>
                  <Button variant="outline" size="sm"><Edit3 className="mr-1.5 h-4 w-4" /> Edit</Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm"><Trash2 className="mr-1.5 h-4 w-4" /> Delete Race</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Race: {race.raceName}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All participant data and results will be permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteRace} className="bg-red-600 hover:bg-red-700">
                        Confirm Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Button variant="outline" onClick={() => navigate("/my-races")}>
          Back to My Races
        </Button>
        {currentStatus === "ongoing" && isAuthenticated && (
          <Button onClick={handleOpenSubmitRideDialog}>
            {hasSubmitted ? "Update Submission" : "Submit Activity"}
          </Button>
        )}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="participants">Participants ({leaderboardParticipants.length})</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Race Details</CardTitle></CardHeader>
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
                <div className="flex items-center"><Calendar className="mr-2 text-muted-foreground" size={18} /><div><p className="text-sm font-medium">Start Date</p><p className="text-muted-foreground">{formatDate(race.startDate)}</p></div></div>
                <div className="flex items-center"><Calendar className="mr-2 text-muted-foreground" size={18} /><div><p className="text-sm font-medium">End Date</p><p className="text-muted-foreground">{formatDate(race.endDate)}</p></div></div>
                <div className="flex items-center"><Trophy className="mr-2 text-muted-foreground" size={18} /><div><p className="text-sm font-medium">Status</p>{getStatusBadge(currentStatus)}</div></div>
                <div className="flex items-center"><Users className="mr-2 text-muted-foreground" size={18} /><div><p className="text-sm font-medium">Participants</p><p className="text-muted-foreground">{race.participantCount || 0}</p></div></div>
                <div className="flex items-center"><ListChecks className="mr-2 text-muted-foreground" size={18}/><div><p className="text-sm font-medium">Segments</p><p className="text-muted-foreground">{race.segmentIds.length}</p></div></div>
                <div className="flex items-center"><Users className="mr-2 text-muted-foreground" size={18}/><div><p className="text-sm font-medium">Privacy</p><p className="text-muted-foreground">{race.isPrivate ? "Private" : "Public"}</p></div></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader><CardTitle>Race Segments</CardTitle><CardDescription>Complete these Strava segments during the race.</CardDescription></CardHeader>
            <CardContent>
              {displaySegments.length > 0 ? (
                <Table><TableHeader><TableRow><TableHead>Segment Name</TableHead><TableHead className="text-right">View</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {displaySegments.map((segment) => (
                      <TableRow key={segment.id}><TableCell className="font-medium">{segment.name}</TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm">
                            <a href={segment.url} target="_blank" rel="noopener noreferrer">
                              Strava <ExternalLink size={14} className="ml-1"/>
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody></Table>
              ) : (<p className="text-muted-foreground p-4 text-center">No segments for this race.</p>)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="participants">
          <Card>
            <CardHeader><CardTitle>Participants</CardTitle><CardDescription>{leaderboardParticipants.length} registered.</CardDescription></CardHeader>
            <CardContent>
              {leaderboardParticipants.length > 0 ? (
                <div className="space-y-3">
                  {leaderboardParticipants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-accent/50 transition-colors">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={participant.profileImage || undefined} alt={participant.name} />
                          <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{participant.name}</p>
                          <p className={`text-xs ${participant.submittedRide ? 'text-green-600' : 'text-muted-foreground'}`}>
                            {participant.submittedRide ? `Submitted (ID: ${participant.submittedActivityId || 'N/A'})` : "No submission yet"}
                          </p>
                        </div>
                      </div>
                       {isOrganizer  && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {participant.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove {participant.name} from the race. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteParticipant(participant.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Confirm Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {!isOrganizer && participant.submittedRide && participant.totalTime !== undefined && (
                             <div className="text-right">
                                <p className="font-semibold text-sm">{formatTime(participant.totalTime)}</p>
                                <p className="text-xs text-muted-foreground">Total Time</p>
                            </div>
                        )}
                    </div>
                  ))}
                </div>
              ) : ( <p className="text-muted-foreground p-4 text-center">No participants yet.</p> )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader><CardTitle>Leaderboard</CardTitle><CardDescription>Standings based on submitted activities.</CardDescription></CardHeader>
            <CardContent>
              {leaderboardParticipants.filter((p) => p.submittedRide && p.totalTime !== undefined).length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Rider</TableHead>
                    {displaySegments.map(segment => (<TableHead key={segment.id} className="text-xs whitespace-nowrap hidden md:table-cell">{segment.name.length > 20 ? segment.name.substring(0,17) + "..." : segment.name}</TableHead>))}
                    <TableHead className="text-right">Total Time</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {leaderboardParticipants
                      .filter((p) => p.submittedRide && p.totalTime !== undefined)
                      .sort((a, b) => (a.totalTime || Infinity) - (b.totalTime || Infinity))
                      .map((participant, index) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-semibold">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center"><Avatar className="h-6 w-6 mr-2">
                                <AvatarImage src={participant.profileImage || undefined} alt={participant.name} />
                                <AvatarFallback>{participant.name?.charAt(0)?.toUpperCase() || 'P'}</AvatarFallback></Avatar>
                              <span className="whitespace-nowrap">{participant.name}</span></div></TableCell>
                           {displaySegments.map(segment => (<TableCell key={`${participant.id}-${segment.id}`} className="hidden md:table-cell">{formatTime(participant.segmentTimes?.[segment.id.toString()])}</TableCell>))}
                          <TableCell className="font-medium text-right">{formatTime(participant.totalTime)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody></Table>
              ) : (<div className="text-center py-10"><p className="text-muted-foreground mb-4">No results yet. Leaderboard populates after submissions.</p>
                  {currentStatus === "ongoing" && !hasSubmitted && isAuthenticated && (<Button onClick={handleOpenSubmitRideDialog}>Submit Your Activity</Button>)}</div>)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Submit Strava Activity</DialogTitle>
            <DialogDescription>
              Select an activity from {race?.startDate ? formatDate(race.startDate) : 'N/A'} to {race?.endDate ? formatDate(race.endDate) : 'N/A'}.
            </DialogDescription></DialogHeader>
          <div className="py-4 space-y-4">
            {isFetchingActivities && (<div className="flex items-center justify-center p-6"><Loader2 className="animate-spin h-8 w-8 text-primary" /><p className="ml-2">Fetching activities...</p></div>)}
            {!isFetchingActivities && activityFetchError && (<p className="text-center text-destructive p-2 border border-destructive/50 rounded-md bg-destructive/10">{activityFetchError}</p>)}
            {!isFetchingActivities && !activityFetchError && stravaActivities.length === 0 && (<p className="text-center text-muted-foreground p-6">No eligible Strava activities found.</p>)}
            
            {!isFetchingActivities && stravaActivities.length > 0 && (
               <Select onValueChange={setSelectedActivity} value={selectedActivity || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an activity to submit" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {stravaActivities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id.toString()}>
                      {activity.name} ({format(parseISO(activity.startDateLocal), "MMM d, h:mm a")}, {(activity.distance / 1000).toFixed(1)}km)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
             {activitySubmissionError && (<p className="text-sm text-destructive pt-2 text-center">{activitySubmissionError}</p>)}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setSubmitDialogOpen(false); setSelectedActivity(null); }} disabled={isSubmittingActivity}>Cancel</Button>
            <Button type="button" onClick={handleActivitySubmit} disabled={!selectedActivity || isSubmittingActivity || isFetchingActivities}>
              {isSubmittingActivity ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RaceDetail;