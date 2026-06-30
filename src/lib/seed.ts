import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Task } from '../types/Task';
import { subDays, addDays, setHours, setMinutes } from 'date-fns';

/**
 * Seeds 15-20 realistic historical and upcoming tasks for the authenticated user.
 * This satisfies features.md & testing-review.md guidelines for demo seeding.
 */
export async function seedDemoTasks(userId: string): Promise<number> {
  const tasksCol = collection(db, 'tasks');
  const now = new Date();

  // Helper to generate dynamic timestamps relative to today
  const relativeTimestamp = (daysOffset: number, hour = 12, minute = 0): Timestamp => {
    let date = daysOffset < 0 
      ? subDays(now, Math.abs(daysOffset)) 
      : addDays(now, daysOffset);
    date = setHours(date, hour);
    date = setMinutes(date, minute);
    return Timestamp.fromDate(date);
  };

  const seedData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // --- Completed Tasks (Historical, past 30 days) ---
    {
      userId,
      title: 'Submit Chemistry Lab Report 3',
      description: 'Submitted PDF report on acid-base titration curves.',
      taskType: 'assignment',
      priority: 4,
      estimatedMinutes: 120,
      deadline: relativeTimestamp(-25, 14, 0),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Email Professor Miller regarding extension',
      description: 'Asked for 2-day extension on research draft.',
      taskType: 'email',
      priority: 2,
      estimatedMinutes: 15,
      deadline: relativeTimestamp(-22, 17, 0),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Pay electricity bill',
      description: 'Automatic payment processed via portal.',
      taskType: 'bill_payment',
      priority: 3,
      estimatedMinutes: 20,
      deadline: relativeTimestamp(-18, 23, 59),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Study Chapter 4 & 5 for Midterm',
      description: 'Reviewed practice problems and conceptual slides.',
      taskType: 'exam_prep',
      priority: 4,
      estimatedMinutes: 180,
      deadline: relativeTimestamp(-14, 10, 0),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Prepare agenda for project sync',
      description: 'Shared slide deck outline and milestone timeline.',
      taskType: 'meeting_prep',
      priority: 3,
      estimatedMinutes: 45,
      deadline: relativeTimestamp(-12, 9, 0),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Register for fall courses',
      description: 'Registered successfully. Added elective and core labs.',
      taskType: 'general',
      priority: 5,
      estimatedMinutes: 30,
      deadline: relativeTimestamp(-9, 8, 30),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Review PR for frontend landing page',
      description: 'Left comments regarding responsive layout issues.',
      taskType: 'general',
      priority: 2,
      estimatedMinutes: 60,
      deadline: relativeTimestamp(-6, 18, 0),
      status: 'done',
      source: 'manual',
    },
    {
      userId,
      title: 'Pay internet subscription',
      description: 'Monthly broadband payment.',
      taskType: 'bill_payment',
      priority: 3,
      estimatedMinutes: 15,
      deadline: relativeTimestamp(-3, 23, 59),
      status: 'done',
      source: 'manual',
    },

    // --- Missed Tasks (Historical, past 30 days) ---
    {
      userId,
      title: 'Draft literature review introduction',
      description: 'Missed deadline completely due to work schedule overload.',
      taskType: 'assignment',
      priority: 4,
      estimatedMinutes: 150,
      deadline: relativeTimestamp(-15, 12, 0),
      status: 'missed',
      source: 'manual',
      aiReasoningLog: [
        'Deadline missed: task was left pending after target deadline passed.',
        'Replanning agent: noted backlog pressure, recommending rescheduling downstream actions.'
      ]
    },
    {
      userId,
      title: 'Email TA about homework grade discrepancy',
      description: 'Missed window to ask before assignments closed.',
      taskType: 'email',
      priority: 1,
      estimatedMinutes: 20,
      deadline: relativeTimestamp(-10, 17, 0),
      status: 'missed',
      source: 'manual',
    },
    {
      userId,
      title: 'Submit feedback survey for campus housing',
      description: 'Portal closed before submission.',
      taskType: 'general',
      priority: 1,
      estimatedMinutes: 15,
      deadline: relativeTimestamp(-5, 23, 0),
      status: 'missed',
      source: 'manual',
    },

    // --- Current Overdue / Checkpoint Missed Tasks (For Demo) ---
    {
      userId,
      title: 'Urgent: Submit Thesis Abstract Draft',
      description: 'Needs final review from thesis advisor.',
      taskType: 'assignment',
      priority: 5,
      estimatedMinutes: 90,
      deadline: relativeTimestamp(-1, 15, 0), // Overdue by 1 day
      status: 'in_progress',
      source: 'manual',
    },
    {
      userId,
      title: 'Design mockup review with team',
      description: 'Checkpoint was set for yesterday, but progress target was missed.',
      taskType: 'meeting_prep',
      priority: 3,
      estimatedMinutes: 60,
      deadline: relativeTimestamp(2, 10, 0),
      status: 'in_progress',
      source: 'manual',
      accountabilityContactEmail: 'accountability-demo@deadlineai.com',
      checkpointPercent: 50,
      checkpointTime: relativeTimestamp(-1, 17, 0), // Checkpoint was yesterday
      checkpointMet: false, // Checkpoint explicitly missed
      aiReasoningLog: [
        'Checkpoint missed: reached 0% progress (target was 50% by yesterday 17:00).',
        'Accountability Agent: dispatching automatic alert email to partner (accountability-demo@deadlineai.com).'
      ]
    },

    // --- Today's Tasks (Triggers overload logic if availableHours is low, e.g. 5 hours) ---
    // Total estimated minutes today: 120 + 90 + 60 + 60 = 330 minutes (5.5 hours)
    {
      userId,
      title: 'Prepare Biology Exam Chapter 7',
      description: 'Review slides and self-test questions.',
      taskType: 'exam_prep',
      priority: 4,
      estimatedMinutes: 120,
      deadline: relativeTimestamp(0, 18, 0),
      status: 'pending',
      source: 'manual',
    },
    {
      userId,
      title: 'Draft slides for marketing pitch',
      description: 'Prepare key value props and competitor grid.',
      taskType: 'assignment',
      priority: 3,
      estimatedMinutes: 90,
      deadline: relativeTimestamp(0, 16, 0),
      status: 'in_progress',
      source: 'voice',
    },
    {
      userId,
      title: 'Email project status report',
      description: 'Compile bullets for the weekly stakeholder sync.',
      taskType: 'email',
      priority: 2,
      estimatedMinutes: 60,
      deadline: relativeTimestamp(0, 20, 0),
      status: 'pending',
      source: 'manual',
    },
    {
      userId,
      title: 'Clean workspace and organize files',
      description: 'Tidy up physical desk and archive old downloads.',
      taskType: 'general',
      priority: 1,
      estimatedMinutes: 60,
      deadline: relativeTimestamp(0, 22, 0),
      status: 'pending',
      source: 'manual',
    },

    // --- Upcoming Tasks (This Week) ---
    {
      userId,
      title: 'Midterm Exam - Physics II',
      description: 'Covers thermodynamics and electromagnetic induction.',
      taskType: 'exam_prep',
      priority: 5,
      estimatedMinutes: 240,
      deadline: relativeTimestamp(3, 9, 0),
      status: 'pending',
      source: 'manual',
    },
    {
      userId,
      title: 'Review competitor marketing campaign',
      description: 'Analyze keywords and ad landing pages.',
      taskType: 'meeting_prep',
      priority: 2,
      estimatedMinutes: 80,
      deadline: relativeTimestamp(5, 14, 0),
      status: 'pending',
      source: 'manual',
    },
    {
      userId,
      title: 'Renew driver license',
      description: 'Must complete online renewal before birthdate.',
      taskType: 'general',
      priority: 4,
      estimatedMinutes: 40,
      deadline: relativeTimestamp(6, 17, 0),
      status: 'pending',
      source: 'manual',
    }
  ];

  let addedCount = 0;
  for (const task of seedData) {
    await addDoc(tasksCol, {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    addedCount++;
  }

  return addedCount;
}
