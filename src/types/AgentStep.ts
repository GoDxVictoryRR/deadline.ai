/** Represents a single step in the Gemini function-calling replanning trace */
export interface AgentStep {
  id: string;
  toolName: 'assessSchedulePressure' | 'reprioritizeTasks' | 'notifyUser';
  summary: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Raw input passed to the tool */
  input?: unknown;
  /** Raw output returned by the tool */
  output?: unknown;
  startedAt?: Date;
  completedAt?: Date;
}
