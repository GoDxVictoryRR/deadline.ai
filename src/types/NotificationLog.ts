import type { Timestamp } from 'firebase/firestore';

export type NotificationType =
  | 'checkpoint_missed'
  | 'deadline_approaching'
  | 'replan_occurred';

export interface NotificationLog {
  id: string;
  userId: string;
  taskId: string;
  type: NotificationType;
  recipientEmail: string;
  sentAt: Timestamp;
  appsScriptResponseStatus: number | null;
}
