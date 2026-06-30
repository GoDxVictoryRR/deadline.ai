import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { classificationModel, withRetry, parseGeminiJson } from './gemini';
import type { Task } from '../types/Task';

export interface ClassificationResult {
  title: string;
  taskType: Task['taskType'];
  priority: Task['priority'];
  estimatedMinutes: number;
  /** null when the user didn't mention a deadline */
  deadline: Timestamp | null;
}

const VALID_TASK_TYPES = new Set<string>([
  'assignment', 'email', 'meeting_prep', 'exam_prep', 'bill_payment', 'general',
]);

function toValidTaskType(raw: unknown): Task['taskType'] {
  const s = String(raw ?? '').toLowerCase();
  return VALID_TASK_TYPES.has(s) ? (s as Task['taskType']) : 'general';
}

function toValidPriority(raw: unknown): Task['priority'] {
  const n = Math.round(Number(raw));
  if (n >= 1 && n <= 5) return n as Task['priority'];
  return 3;
}

/**
 * Classify a raw task description using Gemini 2.0 Flash.
 *
 * Returns a structured classification result with sensible fallbacks
 * when the model returns malformed JSON (SKILL.md gotcha).
 *
 * Coding-style.md:
 * - maxOutputTokens is deliberately low (classification needs ~100 tokens)
 * - JSON stripped of fences before parsing, wrapped in try-catch
 * - exponential back-off via withRetry on 429s
 */
export async function classifyTask(rawText: string): Promise<ClassificationResult> {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const prompt = `Today is ${today}.

Analyze the following task and return ONLY a JSON object. No markdown fences, no commentary, no extra text.

Task description: "${rawText}"

Return exactly this JSON structure:
{
  "title": "short task title extracted from the text (3–8 words)",
  "taskType": "one of: assignment, email, meeting_prep, exam_prep, bill_payment, general",
  "priority": a number from 1 to 5 (1=lowest, 5=critical — be realistic; most tasks are 2 or 3),
  "estimatedMinutes": a realistic integer (email 20–45 min, assignment 60–240 min, exam prep 120–300 min, bill payment 10–15 min),
  "deadline": "ISO 8601 datetime string if a deadline was mentioned (resolve relative terms like 'tomorrow', 'Friday', 'next week' to the actual date), otherwise null"
}`;

  let raw: string;
  try {
    raw = await withRetry(async () => {
      const result = await classificationModel.generateContent(prompt);
      return result.response.text();
    });
  } catch {
    // Network error or max retries exceeded — return safe defaults
    return buildFallback(rawText);
  }

  try {
    const parsed = parseGeminiJson<{
      title?: unknown;
      taskType?: unknown;
      priority?: unknown;
      estimatedMinutes?: unknown;
      deadline?: unknown;
    }>(raw);

    let deadlineTimestamp: Timestamp | null = null;
    if (typeof parsed.deadline === 'string' && parsed.deadline.trim()) {
      const d = new Date(parsed.deadline);
      if (!isNaN(d.getTime())) {
        deadlineTimestamp = Timestamp.fromDate(d);
      }
    }

    return {
      title:
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim().slice(0, 120)
          : rawText.slice(0, 80),
      taskType: toValidTaskType(parsed.taskType),
      priority: toValidPriority(parsed.priority),
      estimatedMinutes: Math.max(5, Math.round(Number(parsed.estimatedMinutes) || 60)),
      deadline: deadlineTimestamp,
    };
  } catch {
    return buildFallback(rawText);
  }
}

function buildFallback(rawText: string): ClassificationResult {
  return {
    title: rawText.slice(0, 80),
    taskType: 'general',
    priority: 3,
    estimatedMinutes: 60,
    deadline: null,
  };
}
