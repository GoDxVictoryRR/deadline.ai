import { format } from 'date-fns';
import { voiceModel, withRetry, parseGeminiJson } from './gemini';
import type { TaskType, Priority } from '../types/Task';

export interface ExtractedTaskResult {
  title: string;
  taskType: TaskType;
  priority: Priority;
  estimatedMinutes: number;
  deadlineIso: string | null; // ISO datetime or null
}

/**
 * Transcribes and extracts structured tasks from base64-encoded webm audio.
 * Uses Gemini 2.0 Flash inline audio data inputs.
 */
export async function extractTasksFromAudio(
  base64AudioData: string,
): Promise<ExtractedTaskResult[]> {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  const prompt = `You are an autonomous productivity companion. Today is ${today}.

Listen to the attached audio recording of the user speaking freely about tasks they need to do. 
Extract all distinct, unrelated tasks they mentioned and return them as a JSON array. 
If the user spoke in English, Hindi, or Hinglish (code-mixed), translate the task details into English.
Be sure to split distinct tasks into separate items in the array (do not merge them into one blob).

Return ONLY a JSON array of objects. No markdown fences, no extra text.
JSON Schema:
[
  {
    "title": "short task title (3-8 words, in English)",
    "taskType": "one of: assignment, email, meeting_prep, exam_prep, bill_payment, general",
    "priority": a number from 1 to 5 (1=lowest, 5=critical — be realistic based on context),
    "estimatedMinutes": a realistic integer duration for the task,
    "deadlineIso": "ISO 8601 datetime string if a deadline was mentioned relative to today, otherwise null"
  }
]`;

  try {
    const rawResponse = await withRetry(async () => {
      const result = await voiceModel.generateContent([
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: base64AudioData,
          },
        },
        prompt,
      ]);
      return result.response.text();
    });

    const parsed = parseGeminiJson<ExtractedTaskResult[]>(rawResponse);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => ({
      title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : 'Spoken Task',
      taskType: (['assignment', 'email', 'meeting_prep', 'exam_prep', 'bill_payment', 'general'].includes(item.taskType)
        ? item.taskType
        : 'general') as TaskType,
      priority: (item.priority >= 1 && item.priority <= 5 ? Math.round(item.priority) : 3) as Priority,
      estimatedMinutes: Math.max(5, Math.round(Number(item.estimatedMinutes) || 60)),
      deadlineIso: typeof item.deadlineIso === 'string' && item.deadlineIso.trim() ? item.deadlineIso : null,
    }));
  } catch (err) {
    console.error('Audio extraction failed:', err);
    return [];
  }
}
