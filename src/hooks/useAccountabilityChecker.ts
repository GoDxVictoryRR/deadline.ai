import { useEffect, useRef } from 'react';
import { useTaskStore } from '../stores/useTaskStore';
import { useAuthStore } from '../stores/useAuthStore';
import { updateTask } from '../lib/tasks';
import { sendEmailNotification, hasAlreadyNotifiedToday } from '../lib/notifications';

export function useAccountabilityChecker(): void {
  const user = useAuthStore((s) => s.user);
  const tasks = useTaskStore((s) => s.tasks);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkCheckpoints = async () => {
    if (!user) return;
    const now = new Date();

    // Find tasks with pending checkpoints in the past
    const missedCheckpointTasks = tasks.filter((t) => {
      if (t.status === 'done' || !t.checkpointTime || !t.accountabilityContactEmail) return false;
      if (t.checkpointMet !== null && t.checkpointMet !== undefined) return false;

      const checkpointDate = t.checkpointTime.toDate();
      return checkpointDate <= now;
    });

    for (const task of missedCheckpointTasks) {
      const recipient = task.accountabilityContactEmail!;
      const percent = task.checkpointPercent || 50;
      const checkpointTimeStr = task.checkpointTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'the set time';

      try {
        // 1. Mark checkpoint as missed in Firestore
        await updateTask(task.id, {
          checkpointMet: false,
          aiReasoningLog: [
            ...(task.aiReasoningLog || []),
            `Checkpoint missed: reached 0% (goal was ${percent}% by ${checkpointTimeStr}).`
          ]
        });

        // 2. Check if already sent today (idempotency check)
        const alreadyNotified = await hasAlreadyNotifiedToday(task.id, 'checkpoint_missed', recipient);
        if (alreadyNotified) continue;

        // 3. Format and dispatch email via Google Apps Script
        const userName = user.displayName || user.email || 'Your contact';
        const subject = `[DeadlineAI Alert] Checkpoint Missed: ${task.title}`;
        const body = `Hello,

You are receiving this because ${userName} designated you as their accountability partner for the following task:
"${task.title}"

They set a progress checkpoint of ${percent}% complete by ${checkpointTimeStr}, which was missed.

Task Details:
- Description: ${task.description || 'No description provided.'}
- Final Deadline: ${task.deadline.toDate().toLocaleString()}

Please reach out to ${userName} and support them in overcoming procrastination!

--
DeadlineAI autonomous companion`;

        await sendEmailNotification(
          user.uid,
          task.id,
          'checkpoint_missed',
          recipient,
          subject,
          body
        );

      } catch (err) {
        console.error('Accountability check execution error on task', task.id, err);
      }
    }
  };

  useEffect(() => {
    if (!user) return;

    // Run check on mount/updates
    checkCheckpoints();

    // Periodically run checking loops every 60 seconds
    const interval = setInterval(() => {
      checkCheckpoints();
    }, 60000);
    checkIntervalRef.current = interval;

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [tasks, user]);
}
