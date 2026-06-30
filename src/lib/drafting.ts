import { draftingModel, withRetry, parseGeminiJson } from './gemini';

export interface EmailDraftResult {
  subject: string;
  body: string;
}

/**
 * Uses Gemini 2.0 Flash to draft a complete email body and subject line
 * based on the task context.
 */
export async function draftEmailDeliverable(
  title: string,
  description: string,
): Promise<EmailDraftResult> {
  const prompt = `You are a helpful, professional assistant drafting an email for a user task.
  Task Title: "${title}"
  Task Description: "${description}"

  Draft a complete, polite, and context-specific email. Avoid placeholders or template tags like "[Insert Name Here]". Make up realistic details if necessary to make the email ready to send.
  
  Return ONLY a JSON object. No markdown fences, no commentary.
  JSON Schema:
  {
    "subject": "The email subject line",
    "body": "The complete email body text, using normal line breaks"
  }`;

  try {
    const rawResponse = await withRetry(async () => {
      const result = await draftingModel.generateContent(prompt);
      return result.response.text();
    });

    const parsed = parseGeminiJson<EmailDraftResult>(rawResponse);
    return {
      subject: typeof parsed.subject === 'string' ? parsed.subject.trim() : `Regarding: ${title}`,
      body: typeof parsed.body === 'string' ? parsed.body.trim() : description,
    };
  } catch (err) {
    console.error('Email drafting failed:', err);
    return {
      subject: `Regarding: ${title}`,
      body: `Hi,\n\nI am writing to you regarding: ${title}.\n\nDetails: ${description}`,
    };
  }
}

/**
 * Uses Gemini 2.0 Flash to draft a structured outline for assignments, exam preparation,
 * prep work, etc.
 */
export async function draftOutlineDeliverable(
  title: string,
  description: string,
): Promise<string> {
  const prompt = `You are a helpful academic/professional advisor. The user has a task:
  Task Title: "${title}"
  Task Description: "${description}"

  Create a detailed structured study outline, task checklist, or essay structure to help them complete this task. 
  Include major headers, sub-points to address, and resource checklists. Do not use markdown code blocks. Use bullet points and clean structure.

  Return ONLY the text outline.`;

  try {
    return await withRetry(async () => {
      const result = await draftingModel.generateContent(prompt);
      return result.response.text();
    });
  } catch (err) {
    console.error('Outline drafting failed:', err);
    return `Outline for "${title}":\n\n1. Introduction & Objectives\n2. Key milestones and research points\n3. Checklist of tasks to address\n4. Review and final submission steps.`;
  }
}
