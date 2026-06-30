import { classificationModel, withRetry, parseGeminiJson } from './gemini';

export interface FeasibilityTaskInput {
  id: string;
  title: string;
  priority: number;
  estimatedMinutes: number;
}

export interface FeasibilityAnalysisResult {
  isFeasible: boolean;
  aiSummary: string;
  recommendedRescheduleTaskId: string | null;
  recommendedRescheduleReason: string | null;
}

/**
 * Checks the feasibility of today's schedule.
 * If the sum of task durations exceeds available hours,
 * Gemini recommends which task to reschedule and provides a reason.
 */
export async function analyzeScheduleFeasibility(
  tasks: FeasibilityTaskInput[],
  availableHours: number,
): Promise<FeasibilityAnalysisResult> {
  const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);
  const availableMinutes = availableHours * 60;

  // If we have no tasks or are under the available hours limit, it is feasible by default.
  if (totalMinutes <= availableMinutes) {
    return {
      isFeasible: true,
      aiSummary: 'Your schedule is currently within your available hours. Keep it up!',
      recommendedRescheduleTaskId: null,
      recommendedRescheduleReason: null,
    };
  }

  // Construct the prompt with today's task list for Gemini to analyze.
  const taskListJson = JSON.stringify(tasks, null, 2);
  const prompt = `You are an autonomous productivity companion. The user has only ${availableHours} hours (${availableMinutes} minutes) of available time today, but their tasks total ${totalMinutes} minutes. This is an overload of ${totalMinutes - availableMinutes} minutes.

Analyze their tasks list below:
${taskListJson}

Recommend exactly ONE task to move to tomorrow to solve or reduce the overload. 
You should favor rescheduling the task with the lowest priority (1 is lowest, 5 is highest) and greatest estimated time. 
Provide a clear, brief, supportive one-sentence explanation of why you selected this task.

Return ONLY a JSON object. No markdown fences, no commentary.
JSON schema:
{
  "recommendedRescheduleTaskId": "the exact ID string of the recommended task, or null",
  "recommendedRescheduleReason": "a supportive, concise one-sentence reason why moving this task is recommended",
  "aiSummary": "a brief, encouraging, professional summary explaining the overload shortfall"
}`;

  try {
    const rawResponse = await withRetry(async () => {
      const result = await classificationModel.generateContent(prompt);
      return result.response.text();
    });

    const parsed = parseGeminiJson<{
      recommendedRescheduleTaskId?: unknown;
      recommendedRescheduleReason?: unknown;
      aiSummary?: unknown;
    }>(rawResponse);

    const recommendedId = typeof parsed.recommendedRescheduleTaskId === 'string'
      ? parsed.recommendedRescheduleTaskId.trim()
      : null;

    // Verify the recommended ID exists in our task list
    const idExists = tasks.some(t => t.id === recommendedId);

    return {
      isFeasible: false,
      aiSummary: typeof parsed.aiSummary === 'string' && parsed.aiSummary.trim()
        ? parsed.aiSummary.trim()
        : `Your day is overloaded by ${totalMinutes - availableMinutes} minutes.`,
      recommendedRescheduleTaskId: idExists ? recommendedId : (tasks[0]?.id || null),
      recommendedRescheduleReason: typeof parsed.recommendedRescheduleReason === 'string' && parsed.recommendedRescheduleReason.trim()
        ? parsed.recommendedRescheduleReason.trim()
        : 'This task can be rescheduled to tomorrow to balance your workload.',
    };
  } catch (err) {
    console.error('Feasibility analysis failed:', err);
    // Safe client-side fallback if Gemini fails
    // Select lowest priority task
    const sorted = [...tasks].sort((a, b) => a.priority - b.priority);
    const fallbackTask = sorted[0];

    return {
      isFeasible: false,
      aiSummary: `Your schedule has a shortfall of ${totalMinutes - availableMinutes} minutes.`,
      recommendedRescheduleTaskId: fallbackTask ? fallbackTask.id : null,
      recommendedRescheduleReason: fallbackTask 
        ? `Moving "${fallbackTask.title}" (lowest priority) is recommended to fit your schedule.`
        : null,
    };
  }
}
