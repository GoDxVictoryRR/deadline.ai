import type { Timestamp } from 'firebase/firestore';

export interface DailyFeasibility {
  /** Date string, e.g. "2025-06-30" — used as Firestore document ID */
  id: string;
  userId: string;
  availableHours: number;
  totalEstimatedMinutes: number;
  isFeasible: boolean;
  aiSummary: string;
  computedAt: Timestamp;
}
