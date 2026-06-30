import { create } from 'zustand';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { analyzeScheduleFeasibility } from '../lib/feasibility';
import type { Task } from '../types/Task';
import { format } from 'date-fns';

export interface FeasibilityRecommendation {
  taskId: string;
  taskTitle: string;
  reason: string;
}

interface FeasibilityState {
  isFeasible: boolean;
  aiSummary: string;
  loading: boolean;
  error: string | null;
  recommendation: FeasibilityRecommendation | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkFeasibility: (userId: string, tasks: Task[], availableHours: number) => Promise<void>;
  clearRecommendation: () => void;
}

export const useFeasibilityStore = create<FeasibilityState>((set) => ({
  isFeasible: true,
  aiSummary: 'Checking schedule feasibility...',
  loading: false,
  error: null,
  recommendation: null,
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearRecommendation: () => set({ recommendation: null }),

  checkFeasibility: async (userId, tasks, availableHours) => {
    // 1. Filter tasks due today (pending or in_progress)
    const todayStr = format(new Date(), 'yyyy-MM-DD');
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    const todayPendingTasks = tasks.filter((t) => {
      if (t.status === 'done' || t.status === 'missed') return false;
      const deadlineMs = t.deadline?.toDate().getTime() ?? 0;
      return deadlineMs >= startOfToday && deadlineMs < endOfToday;
    });

    const totalEstimatedMinutes = todayPendingTasks.reduce((sum, t) => sum + t.estimatedMinutes, 0);

    // Prevent duplicate triggers if inputs haven't changed (optional optimization, keep simple for now)
    set({ loading: true, error: null });

    try {
      // Form input array for AI analysis
      const aiInput = todayPendingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes,
      }));

      // Compute feasibility and run classification
      const result = await analyzeScheduleFeasibility(aiInput, availableHours);

      // 2. Set recommendation if infeasible and recommended task is found
      let recommendation: FeasibilityRecommendation | null = null;
      if (!result.isFeasible && result.recommendedRescheduleTaskId) {
        const targetTask = todayPendingTasks.find((t) => t.id === result.recommendedRescheduleTaskId);
        if (targetTask) {
          recommendation = {
            taskId: targetTask.id,
            taskTitle: targetTask.title,
            reason: result.recommendedRescheduleReason || 'Rescheduling suggested to free up today.',
          };
        }
      }

      // 3. Update Firestore (Spark Spark plan limits log size by overwriting the date doc ID)
      const docId = `${userId}_${todayStr}`;
      const docRef = doc(db, 'dailyFeasibility', docId);
      
      await setDoc(docRef, {
        userId,
        availableHours,
        totalEstimatedMinutes,
        isFeasible: result.isFeasible,
        aiSummary: result.aiSummary,
        computedAt: Timestamp.now(),
      });

      set({
        isFeasible: result.isFeasible,
        aiSummary: result.aiSummary,
        recommendation,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Could not check feasibility',
        loading: false,
      });
    }
  },
}));
