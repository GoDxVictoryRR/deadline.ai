import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
}

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL as string;

/**
 * Checks if an accountability notification of a specific type has already been
 * logged for a task today (to ensure idempotency at the call site).
 */
export async function hasAlreadyNotifiedToday(
  taskId: string,
  type: string,
  recipientEmail: string,
): Promise<boolean> {
  const logsCol = collection(db, 'notifications_log');
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const q = query(
    logsCol,
    where('taskId', '==', taskId),
    where('type', '==', type),
    where('recipientEmail', '==', recipientEmail),
    where('sentAt', '>=', Timestamp.fromDate(startOfDay)),
  );

  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Calls the Google Apps Script Web App to send an email notification,
 * then records the operation logs in notifications_log Firestore collection.
 */
export async function sendEmailNotification(
  userId: string,
  taskId: string,
  type: 'checkpoint_missed' | 'deadline_approaching' | 'replan_occurred',
  recipientEmail: string,
  subject: string,
  body: string,
): Promise<boolean> {
  const logsCol = collection(db, 'notifications_log');
  let responseStatus: number | null = null;
  let success = false;

  try {
    if (!APPS_SCRIPT_URL) {
      throw new Error('VITE_APPS_SCRIPT_URL is not configured.');
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/plain', // avoid CORS issues on text/plain JSON posts
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject,
        body,
      }),
    });

    responseStatus = res.status;
    success = res.ok;
  } catch (err) {
    console.error('Failed to trigger Apps Script email:', err);
  } finally {
    // Coding-style.md: "the result is logged to notifications_log regardless
    // of success or failure so there is always a record of what was attempted."
    await addDoc(logsCol, {
      userId,
      taskId,
      type,
      recipientEmail,
      sentAt: Timestamp.now(),
      appsScriptResponseStatus: responseStatus,
    });
  }

  return success;
}
