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
    id: number; // Use number
    user: RaceUserForParticipant;
    submittedRide: boolean;
    submittedActivityId?: number; // Use number
  }
  
  export interface RaceOrganiser { // Corresponds to UserSummaryDTO
    stravaId: number; // Use number
    displayName?: string;
    userStravaFirstName?: string;
    userStravaLastName?: string;
    userStravaPic?: string;
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