import type { Task } from '../types/Task';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// ICS Calendar Export — client-side only, zero external services.
// Features.md: "generated entirely client-side with no external service."
// Acceptance: file opens correctly in Google Calendar, Apple Calendar, Outlook.
// ---------------------------------------------------------------------------

/** Escape special characters per RFC 5545 section 3.3.11 (TEXT value type). */
function escapeICSText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')   // backslash first
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Generates a standards-compliant ICS (iCalendar) string for a single task.
 * Dates are formatted in the user's local timezone using a TZID approach.
 */
export function generateICS(task: Task): string {
  const deadline = task.deadline.toDate();

  // DTSTART: start one hour before deadline (estimated start time)
  const dtStart = new Date(deadline.getTime() - task.estimatedMinutes * 60 * 1000);

  // Format: YYYYMMDDTHHmmss (local time, no Z suffix = floating/local)
  const fmtLocal = (d: Date) =>
    format(d, "yyyyMMdd'T'HHmmss");

  // UID: unique per task
  const uid = `${task.id}@deadlineai`;

  const nowStr = fmtLocal(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DeadlineAI//BlockseBlock Hackathon//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${fmtLocal(dtStart)}`,
    `DTEND:${fmtLocal(deadline)}`,
    `SUMMARY:${escapeICSText(task.title)}`,
    task.description
      ? `DESCRIPTION:${escapeICSText(task.description)}`
      : '',
    `PRIORITY:${6 - task.priority}`, // ICS: 1=highest, so invert our 1-5 scale
    `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
    // Add an alarm 30 minutes before for high-priority tasks
    ...(task.priority >= 4
      ? [
          'BEGIN:VALARM',
          'TRIGGER:-PT30M',
          'ACTION:DISPLAY',
          `DESCRIPTION:Reminder: ${escapeICSText(task.title)}`,
          'END:VALARM',
        ]
      : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');

  return lines;
}

/** Triggers a browser download of a .ics file for the given task. */
export function downloadICS(task: Task): void {
  const content = generateICS(task);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  // Sanitize filename: remove characters that are invalid in filenames
  const safeName = task.title.replace(/[^a-z0-9 _-]/gi, '_').slice(0, 50);
  anchor.download = `${safeName}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
