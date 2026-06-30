import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;

// Single client instance shared across all Gemini calls (coding-style.md rule).
export const genAI = new GoogleGenerativeAI(apiKey);

// ---------------------------------------------------------------------------
// Shared models — instantiate once, reuse everywhere.
// maxOutputTokens are set per use-case to save quota and reduce latency.
// ---------------------------------------------------------------------------

/** Used for task classification & feasibility checks — short structured output. */
export const classificationModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { maxOutputTokens: 512 },
});

/** Used for the replanning tool-calling loop. */
export const replanningModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { maxOutputTokens: 1024 },
});

/** Used for deliverable drafting — longer prose output. */
export const draftingModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { maxOutputTokens: 2048 },
});

/** Used for voice extraction — audio inline data input. */
export const voiceModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  generationConfig: { maxOutputTokens: 512 },
});

// ---------------------------------------------------------------------------
// Retry helper — exponential back-off on 429 (rate limit), max 3 attempts.
// Every Gemini call in the app should use this wrapper (coding-style.md rule).
// ---------------------------------------------------------------------------

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      const isRateLimit =
        err instanceof Error &&
        (err.message.includes('429') || err.message.toLowerCase().includes('rate limit'));

      if (isRateLimit && attempt < maxAttempts) {
        // Exponential back-off: 1 s, 2 s, 4 s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  // TypeScript requires a return here; control never reaches this point.
  throw new Error('withRetry: exceeded max attempts');
}

// ---------------------------------------------------------------------------
// JSON extraction helper — defensive strip of markdown fences before parsing.
// Always wrap Gemini JSON responses with this (SKILL.md gotcha).
// ---------------------------------------------------------------------------

export function parseGeminiJson<T>(raw: string): T {
  const stripped = raw
    .replace(/^```(?:json)?/m, '')
    .replace(/```$/m, '')
    .trim();
  return JSON.parse(stripped) as T;
}
