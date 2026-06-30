import { create } from 'zustand';
import type { Task } from '../types/Task';
import type { AgentStep } from '../types/AgentStep';

type TaskFilter = {
  status?: Task['status'];
  priority?: Task['priority'];
};

interface TaskState {
  tasks: Task[];
  activeTask: Task | null;
  filters: TaskFilter;
  loading: boolean;
  error: string | null;
  agentTrace: AgentStep[];
  isReplanning: boolean;
  setTasks: (tasks: Task[]) => void;
  setActiveTask: (task: Task | null) => void;
  setFilters: (filters: TaskFilter) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAgentTrace: (trace: AgentStep[]) => void;
  addAgentStep: (step: AgentStep) => void;
  updateAgentStep: (id: string, updates: Partial<AgentStep>) => void;
  setIsReplanning: (isReplanning: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  activeTask: null,
  filters: {},
  loading: false,
  error: null,
  agentTrace: [],
  isReplanning: false,
  setTasks: (tasks) => set({ tasks }),
  setActiveTask: (activeTask) => set({ activeTask }),
  setFilters: (filters) => set({ filters }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setAgentTrace: (agentTrace) => set({ agentTrace }),
  addAgentStep: (step) => set((state) => ({ agentTrace: [...state.agentTrace, step] })),
  updateAgentStep: (id, updates) =>
    set((state) => ({
      agentTrace: state.agentTrace.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  setIsReplanning: (isReplanning) => set({ isReplanning }),
}));
