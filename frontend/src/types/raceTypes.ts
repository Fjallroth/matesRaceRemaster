// src/types/raceTypes.ts

// Interface for the User object that will be part of RaceParticipant
export interface RaceUserForParticipant {
    stravaId: number;
    displayName?: string;
    userStravaFirstName?: string;
    userStravaLastName?: string;
    userStravaPic?: string;
    userSex?: string;
    // Add any other user fields you might need from the backend User model
  }
  
  // Interface for a single Participant (as part of a Race)
  export interface RaceParticipant {
    id: number; // Participant record ID
    user: RaceUserForParticipant; // Nested user details
    submittedRide: boolean;
    submittedActivityId?: number;
    // segmentResults: ParticipantSegmentResult[]; // You might want a type for this too if detailed results are included
    // Add any other fields from your backend Participant model
  }
  
  // Interface for the User object embedded in Race (specifically the organiser)
  export interface RaceOrganiser {
    stravaId: number;
    displayName?: string;
    userStravaFirstName?: string;
    userStravaLastName?: string;
    userStravaPic?: string;
  }
  
  // Interface for a single Race
  export interface Race {
    id: number;
    raceName: string;
    raceInfo?: string;
    startDate: string; // ISO 8601 string
    endDate: string;   // ISO 8601 string
    segmentIds: number[];
    organiser: RaceOrganiser;
    isPrivate: boolean;
    password?: string;
    participants?: RaceParticipant[]; // Optional: Add participants here
    // joinRequesters: RaceOrganiser[]; // If you fetch this with the race
    // Add any other fields you expect from the backend's Race entity
  }
  
  // Summary type (optional, if you have different list/detail views)
  export interface RaceSummary {
    id: number;
    raceName: string;
    startDate: string;
    endDate: string;
    organiser: RaceOrganiser;
    isPrivate: boolean;
    participantCount?: number;
    status?: "upcoming" | "ongoing" | "finished";
  }