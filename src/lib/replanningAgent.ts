import { genAI } from './gemini';
import { useTaskStore } from '../stores/useTaskStore';
import { updateTask } from './tasks';
import type { Task } from '../types/Task';
import type { AgentStep } from '../types/AgentStep';
import { Timestamp } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Tool Declarations for Gemini Function Calling
// ---------------------------------------------------------------------------

const assessSchedulePressureDeclaration = {
  name: 'assessSchedulePressure',
  description: 'Calculates if remaining tasks fit in today\'s remaining available hours. Returns feasibility and shortfall in minutes.',
  parameters: {
    type: 'OBJECT',
    properties: {
      currentTime: { type: 'STRING', description: 'Current time in HH:MM format (24-hour)' },
      availableHoursRemaining: { type: 'NUMBER', description: 'User\'s remaining available hours for today' }
    },
    required: ['currentTime', 'availableHoursRemaining']
  }
};

const reprioritizeTasksDeclaration = {
  name: 'reprioritizeTasks',
  description: 'Selects which low-priority task(s) to reschedule to tomorrow to resolve the schedule shortfall.',
  parameters: {
    type: 'OBJECT',
    properties: {
      shortfallMinutes: { type: 'NUMBER', description: 'The schedule time deficit in minutes' }
    },
    required: ['shortfallMinutes']
  }
};

const notifyUserDeclaration = {
  name: 'notifyUser',
  description: 'Constructs the final in-app notification message explaining the replanning changes.',
  parameters: {
    type: 'OBJECT',
    properties: {
      message: { type: 'STRING', description: 'Short explanation of what was rescheduled and why' }
    },
    required: ['message']
  }
};

// ---------------------------------------------------------------------------
// Main Replanning Loop Orchestration
// ---------------------------------------------------------------------------

export async function runReplanningAgent(
  triggeringTask: Task,
  allTasks: Task[],
  availableHoursToday: number
): Promise<void> {
  const store = useTaskStore.getState();
  store.setIsReplanning(true);

  // Initialize the steps in the trace UI
  const initialSteps: AgentStep[] = [
    {
      id: 'step_assess',
      toolName: 'assessSchedulePressure',
      summary: 'Assessing remaining schedule load...',
      status: 'pending'
    },
    {
      id: 'step_reprep',
      toolName: 'reprioritizeTasks',
      summary: 'Waiting for pressure assessment...',
      status: 'pending'
    },
    {
      id: 'step_notify',
      toolName: 'notifyUser',
      summary: 'Waiting for reprioritization decisions...',
      status: 'pending'
    }
  ];
  store.setAgentTrace(initialSteps);

  // Filter today's tasks that are not done or missed
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

  const todayTasks = allTasks.filter((t) => {
    if (t.status === 'done' || t.status === 'missed') return false;
    const deadlineMs = t.deadline?.toDate().getTime() ?? 0;
    return deadlineMs >= startOfToday && deadlineMs < endOfToday;
  });

  const totalEstimatedMinutes = todayTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  // Instantiate Gemini with function declaration tools
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    tools: [{
      functionDeclarations: [
        // `as any` required here: the Gemini SDK's FunctionDeclaration type is
        // overly narrow and doesn't accept plain object literals matching the
        // correct schema shape. This is a known SDK type gap (SKILL.md gotcha).
        assessSchedulePressureDeclaration as any,
        reprioritizeTasksDeclaration as any,
        notifyUserDeclaration as any
      ]
    }]
  });

  const chat = model.startChat();

  const prompt = `A schedule disruption occurred: task "${triggeringTask.title}" has been marked MISSED.
  Today's remaining task load is ${totalEstimatedMinutes} minutes. Available hours for today is ${availableHoursToday}.
  
  You must execute the replanning loop. Follow these strict sequence rules:
  1. Call assessSchedulePressure.
  2. If assessSchedulePressure returns a shortfall greater than 0, call reprioritizeTasks with the shortfall.
  3. Finally, call notifyUser to summarize the updates.
  `;

  try {
    const responseResult = await chat.sendMessage(prompt);
    let currentResponse = responseResult.response;

    // Loop while Gemini requests a function call
    let functionCalls = currentResponse.functionCalls();
    let iterations = 0;

    // Safety limit to prevent infinite loops
    while (functionCalls && functionCalls.length > 0 && iterations < 5) {
      iterations++;
      const call = functionCalls[0];
      const toolName = call.name;
      // `as any` required: functionCalls().args is typed as `object` by the SDK
      // but we need to access named properties (e.g. args.shortfallMinutes).
      const args = call.args as any;

      if (toolName === 'assessSchedulePressure') {
        store.updateAgentStep('step_assess', { status: 'running', input: args, startedAt: new Date() });
        
        // Execute assessSchedulePressure locally
        const availableMinutes = availableHoursToday * 60;
        const shortfall = Math.max(0, totalEstimatedMinutes - availableMinutes);
        const isFeasible = shortfall === 0;

        const output = { isFeasible, shortfallMinutes: shortfall };
        
        store.updateAgentStep('step_assess', {
          status: 'completed',
          summary: isFeasible 
            ? 'Schedule is feasible. No changes needed.'
            : `Schedule pressure detected: shortfall of ${shortfall} minutes.`,
          output,
          completedAt: new Date()
        });

        // Send tool output back to Gemini
        const toolResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: 'assessSchedulePressure',
              response: output
            }
          }
        ]);
        currentResponse = toolResponse.response;
      } 
      else if (toolName === 'reprioritizeTasks') {
        store.updateAgentStep('step_reprep', { status: 'running', input: args, startedAt: new Date() });

        const shortfall = Number(args.shortfallMinutes) || 0;
        
        // Execute reprioritizeTasks locally
        // Sort lowest priority tasks first to select which ones to move
        const sortedCandidateTasks = [...todayTasks]
          .filter(t => t.id !== triggeringTask.id) // don't reschedule the already missed task
          .sort((a, b) => a.priority - b.priority || b.estimatedMinutes - a.estimatedMinutes);

        const rescheduledTaskIds: string[] = [];
        let savedMinutes = 0;

        for (const task of sortedCandidateTasks) {
          if (savedMinutes >= shortfall) break;
          rescheduledTaskIds.push(task.id);
          savedMinutes += task.estimatedMinutes;
        }

        // Reschedule these tasks in Firestore
        for (const taskId of rescheduledTaskIds) {
          const task = todayTasks.find(t => t.id === taskId);
          if (task) {
            const currentDeadline = task.deadline.toDate();
            const tomorrow = new Date(currentDeadline.getTime() + 24 * 60 * 60 * 1000);
            
            await updateTask(taskId, {
              deadline: Timestamp.fromDate(tomorrow),
              status: 'rescheduled',
              rescheduledFromDate: task.deadline,
              aiReasoningLog: [
                ...(task.aiReasoningLog || []),
                `Rescheduled automatically by replanning agent due to schedule overload (missed task: "${triggeringTask.title}").`
              ]
            });
          }
        }

        const explanation = rescheduledTaskIds.length > 0
          ? `Moved ${rescheduledTaskIds.length} low-priority task(s) to tomorrow to free up ${savedMinutes} minutes.`
          : 'No tasks needed to be moved.';

        const output = { rescheduledTaskIds, explanation };

        store.updateAgentStep('step_reprep', {
          status: 'completed',
          summary: explanation,
          output,
          completedAt: new Date()
        });

        const toolResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: 'reprioritizeTasks',
              response: output
            }
          }
        ]);
        currentResponse = toolResponse.response;
      } 
      else if (toolName === 'notifyUser') {
        store.updateAgentStep('step_notify', { status: 'running', input: args, startedAt: new Date() });

        // Execute notifyUser locally
        const message = args.message || 'Replanning complete.';
        const output = { status: 'success' };

        store.updateAgentStep('step_notify', {
          status: 'completed',
          summary: message,
          output,
          completedAt: new Date()
        });

        const toolResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: 'notifyUser',
              response: output
            }
          }
        ]);
        currentResponse = toolResponse.response;
      }

      functionCalls = currentResponse.functionCalls();
    }

    // Mark any skipped/remaining steps as completed
    const currentSteps = useTaskStore.getState().agentTrace;
    currentSteps.forEach(step => {
      if (step.status === 'pending') {
        store.updateAgentStep(step.id, { status: 'completed', summary: 'Not required.' });
      }
    });

  } catch (err) {
    console.error('Replanning agent error:', err);
    // Safe fallback: mark all running/pending steps failed
    const currentSteps = useTaskStore.getState().agentTrace;
    currentSteps.forEach(step => {
      if (step.status === 'pending' || step.status === 'running') {
        store.updateAgentStep(step.id, { status: 'failed', summary: 'Execution failed.' });
      }
    });
  } finally {
    store.setIsReplanning(false);
  }
}
