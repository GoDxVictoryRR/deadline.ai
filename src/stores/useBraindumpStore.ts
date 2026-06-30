import { create } from 'zustand';
import type { Task } from '../types/Task';

interface BraindumpState {
  isRecording: boolean;
  isProcessing: boolean;
  extractedTasks: Partial<Task>[];
  error: string | null;
  setIsRecording: (isRecording: boolean) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setExtractedTasks: (tasks: Partial<Task>[]) => void;
  clearExtractedTasks: () => void;
  setError: (error: string | null) => void;
}

export const useBraindumpStore = create<BraindumpState>((set) => ({
  isRecording: false,
  isProcessing: false,
  extractedTasks: [],
  error: null,
  setIsRecording: (isRecording) => set({ isRecording }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setExtractedTasks: (extractedTasks) => set({ extractedTasks }),
  clearExtractedTasks: () => set({ extractedTasks: [] }),
  setError: (error) => set({ error }),
}));
