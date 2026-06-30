import type { TaskType } from '../types/Task';

export interface TaskTypeConfig {
  label: string;
  icon: string; // lucide icon name
  defaultEstimatedMinutes: number;
}

export const taskTypeConfig: Record<TaskType, TaskTypeConfig> = {
  assignment: {
    label: 'Assignment',
    icon: 'FileText',
    defaultEstimatedMinutes: 120,
  },
  email: {
    label: 'Email',
    icon: 'Mail',
    defaultEstimatedMinutes: 30,
  },
  meeting_prep: {
    label: 'Meeting Prep',
    icon: 'Users',
    defaultEstimatedMinutes: 45,
  },
  exam_prep: {
    label: 'Exam Prep',
    icon: 'BookOpen',
    defaultEstimatedMinutes: 180,
  },
  bill_payment: {
    label: 'Bill Payment',
    icon: 'CreditCard',
    defaultEstimatedMinutes: 15,
  },
  general: {
    label: 'General',
    icon: 'CheckSquare',
    defaultEstimatedMinutes: 60,
  },
};
