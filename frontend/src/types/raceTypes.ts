// src/types/raceTypes.ts

export interface RaceUserForParticipant { // Corresponds to UserSummaryDTO
    stravaId: number; // Use number to match backend Long
    displayName?: string;
    userStravaFirstName?: string;
    userStravaLastName?: string;
    userStravaPic?: string;
    userSex?: string;
  }
  
  export interface RaceParticipant { // Corresponds to ParticipantSummaryDTO
    id: number;
    user: RaceUserForParticipant;
    submittedRide: boolean;
    submittedActivityId?: number;
    segmentResults?: ParticipantSegmentResult[]; // <-- ADDED
    // totalTime and segmentTimes for display can be derived in frontend RaceDetail component
  }
  
  export interface RaceOrganiser { // Corresponds to UserSummaryDTO
    stravaId: number; // Use number
    displayName?: string;
    userStravaFirstName?: string;
    userStravaLastName?: string;
    userStravaPic?: string;
  }
  
  export interface StravaActivity {
    id: number;
    name: string;
    startDateLocal: string; // ISO string "2024-07-29T18:30:00Z"
    distance: number; // in meters
    elapsedTime: number; // in seconds
    type: string; // "Ride", "Run" etc.
  }

  export interface ParticipantSegmentResult {
    segmentId: number;
    segmentName?: string; // Optional, depends on backend sending it
    elapsedTimeSeconds?: number;
  }
  
  export interface Race { // Corresponds to RaceResponseDTO
    id: number; // Use number
    raceName: string;
    raceInfo?: string;
    startDate: string; 
    endDate: string;   
    segmentIds: number[]; // Use number[]
    organiser: RaceOrganiser;
    isPrivate: boolean;
    // password?: string; // Typically not sent from backend for GET requests
    participants?: RaceParticipant[]; // For RaceDetail view, populated by backend
    participantCount: number; // For MyRaces list view
  }
  
  // This summary might not be strictly needed if Race type is flexible enough
  export interface RaceSummary {
    id: number;
    raceName: string;
    startDate: string;
    endDate: string;
    organiser: RaceOrganiser;
    isPrivate: boolean;
    participantCount: number; // Ensure this is present
    status?: "upcoming" | "ongoing" | "finished";
  }