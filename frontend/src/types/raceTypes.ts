export interface RaceUserForParticipant {
  stravaId: number;
  displayName?: string;
  userStravaFirstName?: string;
  userStravaLastName?: string;
  userStravaPic?: string;
  userSex?: string; // 'M' or 'F'
}

export interface RaceParticipant {
  id: number;
  user: RaceUserForParticipant;
  submittedRide: boolean;
  submittedActivityId?: number;
  segmentResults?: ParticipantSegmentResult[];
}

export interface RaceOrganiser {
  stravaId: number;
  displayName?: string;
  userStravaFirstName?: string;
  userStravaLastName?: string;
  userStravaPic?: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  startDateLocal: string;
  distance: number;
  elapsedTime: number;
  type: string;
}

export interface ParticipantSegmentResult {
  segmentId: number;
  segmentName?: string;
  elapsedTimeSeconds?: number | null;
}

export interface Race {
  id: number;
  raceName: string;
  raceInfo?: string;
  startDate: string;
  endDate: string;
  segmentIds: number[];
  organiser: RaceOrganiser;
  isPrivate: boolean; 
  hideLeaderboardUntilFinish: boolean;
  useSexCategories: boolean; 
  participants?: RaceParticipant[];
  participantCount: number;
}

export interface RaceSummary {
  id: number;
  raceName: string;
  startDate: string;
  endDate: string;
  organiser: RaceOrganiser;
  isPrivate: boolean; 
  hideLeaderboardUntilFinish: boolean;
  useSexCategories: boolean; 
  participantCount: number;
  status?: "upcoming" | "ongoing" | "finished";
}