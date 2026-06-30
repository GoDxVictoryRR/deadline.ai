import type { Timestamp } from 'firebase/firestore';

export type TaskType =
  | 'assignment'
  | 'email'
  | 'meeting_prep'
  | 'exam_prep'
  | 'bill_payment'
  | 'general';

export type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'done'
  | 'missed'
  | 'rescheduled';

export type TaskSource = 'manual' | 'voice' | 'ai_suggested';

export type DraftType = 'email' | 'outline';

/** 1 = lowest priority, 5 = highest/critical */
export type Priority = 1 | 2 | 3 | 4 | 5;

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  taskType: TaskType;
  /** AI-assigned 1-5 scale */
  priority: Priority;
  /** AI-assigned estimated minutes */
  estimatedMinutes: number;
  deadline: Timestamp;
  status: TaskStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: TaskSource;
  /** Optional checkpoint: percentage of work done by checkpointTime */
  checkpointPercent?: number;
  checkpointTime?: Timestamp;
  /** null = not yet evaluated, true/false = evaluated */
  checkpointMet?: boolean | null;
  /** Set by the replanning agent when a task is moved to another day */
  rescheduledFromDate?: Timestamp;
  /** AI-generated draft content for email/outline tasks */
  draftContent?: string;
  draftType?: DraftType;
  /** Accountability contact email for this specific task */
  accountabilityContactEmail?: string;
  /** Log of AI reasoning for any autonomous action taken on this task */
  aiReasoningLog?: string[];
}
