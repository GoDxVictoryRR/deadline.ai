import { draftingModel, withRetry } from './gemini';
import type { Task } from '../types/Task';
import { subDays } from 'date-fns';

export interface PatternAnalysisResult {
  diagnostic: string;
  analysedTaskCount: number;
}

/**
 * Sends the user's last 30 days of task history to Gemini 2.0 Flash
 * and asks for a behavioral procrastination pattern analysis.
 * Features.md: "returns a short diagnostic paragraph identifying a behavioral
 * pattern, similar in spirit to a doctor reading symptom history."
 */
export async function analyzePatterns(tasks: Task[]): Promise<PatternAnalysisResult> {
  const cutoff = subDays(new Date(), 30);

  const relevantTasks = tasks.filter((t) => {
    const date = t.createdAt?.toDate() ?? t.deadline?.toDate() ?? new Date(0);
    return (
      date >= cutoff &&
      (t.status === 'done' || t.status === 'missed' || t.status === 'rescheduled')
    );
  });

  if (relevantTasks.length === 0) {
    return {
      diagnostic:
        'Not enough task history in the last 30 days to detect a meaningful pattern. Complete or miss some tasks first.',
      analysedTaskCount: 0,
    };
  }

  // Build a compact summary of each task's outcome relative to its deadline.
  const taskSummaries = relevantTasks.map((t) => {
    const deadlineMs = t.deadline?.toDate().getTime() ?? Date.now();
    const createdMs = t.createdAt?.toDate().getTime() ?? deadlineMs;
    const hoursUntilDeadline = Math.round((deadlineMs - createdMs) / (1000 * 60 * 60));
    return {
      title: t.title,
      type: t.taskType,
      priority: t.priority,
      estimatedMinutes: t.estimatedMinutes,
      status: t.status,
      hoursOfLeadTime: hoursUntilDeadline,
    };
  });

  const prompt = `You are a behavioral productivity analyst. Review this user's task history from the past 30 days and identify ONE clear behavioral pattern related to procrastination, deadline management, or task completion habits.

Task history (${taskSummaries.length} tasks):
${JSON.stringify(taskSummaries, null, 2)}

Write a single diagnostic paragraph (3-5 sentences) in the style of a doctor reading a patient's history — direct, specific, and based only on the data above. Name the pattern explicitly (e.g. "exam-prep tasks are consistently started too late", "high-priority tasks are completed on time but low-priority ones are routinely missed"). Do NOT give generic advice. Do NOT list each task. Synthesize into one clear insight. Speak directly to the user as "you".`;

  try {
    const text = await withRetry(async () => {
      const result = await draftingModel.generateContent(prompt);
      return result.response.text();
    });
    return {
      diagnostic: text.trim(),
      analysedTaskCount: relevantTasks.length,
    };
  } catch (err) {
    console.error('Pattern analysis failed:', err);
    return {
      diagnostic:
        'Could not complete pattern analysis right now. Please try again in a moment.',
      analysedTaskCount: relevantTasks.length,
    };
  }
}
