import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/useTaskStore';
import { updateTask } from '../lib/tasks';
import { Timestamp } from 'firebase/firestore';
import TaskForm from '../components/features/TaskForm';
import TaskCard from '../components/features/TaskCard';
import FeasibilityBanner from '../components/features/FeasibilityBanner';
import AgentTrace from '../components/features/AgentTrace';
import { Play, CheckCircle, Clock, CheckSquare, Mic } from 'lucide-react';

import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useFeasibilityStore } from '../stores/useFeasibilityStore';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function Today() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { tasks, loading, error } = useTaskStore();
  const defaultAvailableHours = useSettingsStore((s) => s.defaultAvailableHours);
  const checkFeasibility = useFeasibilityStore((s) => s.checkFeasibility);
  const isReplanning = useTaskStore((s) => s.isReplanning);

  // Trigger feasibility analysis when tasks or settings update
  useEffect(() => {
    if (user) {
      checkFeasibility(user.uid, tasks, defaultAvailableHours);
    }
  }, [tasks, defaultAvailableHours, user, checkFeasibility]);

  // Trigger agent replanning loop when a task is marked missed
  useEffect(() => {
    if (!user || isReplanning) return;

    const missedTaskWithoutLog = tasks.find(
      (t) =>
        t.status === 'missed' &&
        (!t.aiReasoningLog || !t.aiReasoningLog.some((log) => log.includes('replanning agent')))
    );

    if (missedTaskWithoutLog) {
      import('../lib/replanningAgent').then(({ runReplanningAgent }) => {
        runReplanningAgent(missedTaskWithoutLog, tasks, defaultAvailableHours);
      });
    }
  }, [tasks, user, defaultAvailableHours, isReplanning]);

  // Helper to check if a date is within today
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Helper to check if a date is within the current week (next 7 days)
  const isThisWeek = (date: Date) => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return date.getTime() >= today.getTime() && date.getTime() <= nextWeek.getTime() && !isToday(date);
  };

  const todayTasks = tasks.filter((t) => {
    const d = t.deadline?.toDate();
    return d && isToday(d);
  });

  const weekTasks = tasks.filter((t) => {
    const d = t.deadline?.toDate();
    return d && isThisWeek(d);
  });

  // Action: start task
  const handleStartTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await updateTask(id, { status: 'in_progress' });
  };

  // Action: complete task
  const handleCompleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await updateTask(id, { status: 'done' });
  };

  // Action: snooze task to tomorrow
  const handleSnoozeTask = async (e: React.MouseEvent, id: string, currentDeadline: Timestamp) => {
    e.stopPropagation();
    const current = currentDeadline.toDate();
    const tomorrow = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    await updateTask(id, {
      deadline: Timestamp.fromDate(tomorrow),
      status: 'rescheduled',
      rescheduledFromDate: currentDeadline,
    });
  };

  const renderTaskSection = (title: string, list: typeof tasks, showSnooze = false) => {
    if (list.length === 0) return null;

    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider px-1">
          {title} ({list.length})
        </h3>
        <div className="grid gap-3">
          {list.map((task) => (
            <div key={task.id} className="group relative">
              <TaskCard task={task} />
              
              {/* Quick Actions (Hover Overlay) */}
              <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1.5 bg-slate-900/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-700/80 shadow-lg">
                {task.status === 'pending' && (
                  <button
                    onClick={(e) => handleStartTask(e, task.id)}
                    className="p-1.5 hover:bg-slate-800 text-blue-400 rounded transition-colors"
                    title="Start Task"
                  >
                    <Play className="w-3.5 h-3.5 fill-blue-400" />
                  </button>
                )}
                {task.status !== 'done' && (
                  <button
                    onClick={(e) => handleCompleteTask(e, task.id)}
                    className="p-1.5 hover:bg-slate-800 text-green-400 rounded transition-colors"
                    title="Complete Task"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </button>
                )}
                {task.status !== 'done' && showSnooze && (
                  <button
                    onClick={(e) => handleSnoozeTask(e, task.id, task.deadline)}
                    className="p-1.5 hover:bg-slate-800 text-amber-400 rounded transition-colors"
                    title="Snooze to Tomorrow"
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Live Agent Trace terminal */}
      <AgentTrace />

      {/* Feasibility Header Banner */}
      <FeasibilityBanner />

      {/* Quick Add Form */}
      <TaskForm />

      {error && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tasks display */}
      {!loading && tasks.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/20 border border-dashed border-slate-800 rounded-3xl p-8 flex flex-col items-center">
          <CheckSquare className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-white">Nothing on your plate</h3>
          <p className="text-slate-500 text-sm max-w-sm mt-1">
            Add a task above using natural language or head over to Voice Braindump to speak freely.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate('/braindump')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition-colors border border-slate-700/50 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-blue-400" />
              <span>Voice Braindump</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Today's Tasks */}
          {renderTaskSection("Today's Tasks", todayTasks, true)}

          {/* Upcoming this week */}
          {renderTaskSection('Upcoming this Week', weekTasks, false)}

          {/* Other / Unsorted or Backlog (No deadlines or past this week) */}
          {renderTaskSection(
            'Remaining Backlog',
            tasks.filter(
              (t) =>
                !todayTasks.some((x) => x.id === t.id) &&
                !weekTasks.some((x) => x.id === t.id)
            ),
            false
          )}
        </div>
      )}
    </div>
  );
}
