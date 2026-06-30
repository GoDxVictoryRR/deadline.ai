import { useFeasibilityStore } from '../../stores/useFeasibilityStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { updateTask } from '../../lib/tasks';
import { CheckCircle, Zap, ArrowRight } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function FeasibilityBanner() {
  const { isFeasible, aiSummary, recommendation, loading, clearRecommendation } = useFeasibilityStore();
  const tasks = useTaskStore((s) => s.tasks);

  // Accept the AI's recommendation to reschedule
  const handleAcceptRecommendation = async () => {
    if (!recommendation) return;

    const targetTask = tasks.find((t) => t.id === recommendation.taskId);
    if (!targetTask) return;

    const currentDeadline = targetTask.deadline.toDate();
    const tomorrow = new Date(currentDeadline.getTime() + 24 * 60 * 60 * 1000);

    const logMsg = `Deadline Reality Engine: Rescheduled task to tomorrow. Reason: ${recommendation.reason}`;

    try {
      await updateTask(recommendation.taskId, {
        deadline: Timestamp.fromDate(tomorrow),
        status: 'rescheduled',
        rescheduledFromDate: targetTask.deadline,
        aiReasoningLog: [...(targetTask.aiReasoningLog || []), logMsg],
      });
      // Clear the current suggestion from view
      clearRecommendation();
    } catch (err) {
      console.error('Failed to reschedule recommended task:', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex items-center justify-center gap-3 animate-pulse">
        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400 font-medium">Analyzing schedule pressure with Gemini...</span>
      </div>
    );
  }

  // 1. Feasible State (Green)
  if (isFeasible) {
    return (
      <div className="w-full bg-green-500/10 border border-green-500/20 text-green-300 rounded-2xl p-4 flex items-center gap-3.5 shadow-sm transition-all duration-300">
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-semibold text-white">Schedule is Feasible</h4>
          <p className="text-xs text-green-400/90 mt-0.5">{aiSummary}</p>
        </div>
      </div>
    );
  }

  // 2. Overloaded State with AI Recommendation (Amber-to-Red gradient banner)
  return (
    <div
      className="w-full bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/25 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg transition-all duration-300"
      role="status"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 bg-red-500/20 rounded-xl border border-red-500/30 text-red-400 mt-0.5">
          <Zap className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white tracking-tight">Today is Overloaded</h4>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl">{aiSummary}</p>

          {recommendation && (
            <div className="mt-3 p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                AI Recommendation
              </span>
              <p className="text-xs text-white">
                Move &ldquo;<span className="font-semibold text-amber-300">{recommendation.taskTitle}</span>&rdquo; to tomorrow.
              </p>
              <p className="text-xs text-slate-400 italic font-mono">&ldquo;{recommendation.reason}&rdquo;</p>
            </div>
          )}
        </div>
      </div>

      {recommendation && (
        <button
          onClick={handleAcceptRecommendation}
          className="flex items-center justify-center gap-1.5 px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-[1px] cursor-pointer w-full md:w-auto"
        >
          <span>Accept Plan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
