import type { Timestamp } from 'firebase/firestore';

export interface AppUser {
  id: string; // Firebase Auth UID
  displayName: string;
  email: string;
  defaultAvailableHours: number;
  accountabilityContacts: { name: string; email: string }[];
  completionStreak: number;
  totalTasksCompleted: number;
  createdAt: Timestamp;
}
