import { useMemo, useState } from 'react';
import { useTaskStore } from '../stores/useTaskStore';
import { useAuthStore } from '../stores/useAuthStore';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { format, isToday, isPast } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, AlertTriangle, BarChart2, Target,
  TrendingUp, Calendar, ChevronRight, Brain, Loader2,
} from 'lucide-react';
import { analyzePatterns } from '../lib/patternAnalysis';

// ── Palette ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  done: '#22c55e',
  in_progress: '#3b82f6',
  pending: '#94a3b8',
  missed: '#ef4444',
  rescheduled: '#f59e0b',
};

const PRIORITY_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical',
};

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.FC<{ className?: string }>; color: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl bg-opacity-20 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom Pie Tooltip ────────────────────────────────────────────────────────
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <span className="capitalize">{payload[0].name.replace('_', ' ')}</span>: <strong>{payload[0].value}</strong>
    </div>
  );
}

// ── Bar Tooltip ────────────────────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl">
      <p className="font-bold">{label}</p>
      <p>Tasks: {payload[0].value}</p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const tasks = useTaskStore((s) => s.tasks);
  const user = useAuthStore((s) => s.user);

  // Pattern Analysis state
  const [patternLoading, setPatternLoading] = useState(false);
  const [patternResult, setPatternResult] = useState<string | null>(null);
  const [patternTaskCount, setPatternTaskCount] = useState(0);

  const handleAnalyzePatterns = async () => {
    setPatternLoading(true);
    setPatternResult(null);
    const result = await analyzePatterns(tasks);
    setPatternResult(result.diagnostic);
    setPatternTaskCount(result.analysedTaskCount);
    setPatternLoading(false);
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'done').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const missed = tasks.filter((t) => t.status === 'missed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const rescheduled = tasks.filter((t) => t.status === 'rescheduled').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, inProgress, missed, pending, rescheduled, completionRate };
  }, [tasks]);

  const statusChartData = useMemo(() => {
    return [
      { name: 'done', value: stats.done },
      { name: 'in_progress', value: stats.inProgress },
      { name: 'pending', value: stats.pending },
      { name: 'missed', value: stats.missed },
      { name: 'rescheduled', value: stats.rescheduled },
    ].filter((d) => d.value > 0);
  }, [stats]);

  const priorityChartData = useMemo(() => {
    return [1, 2, 3, 4, 5].map((p) => ({
      name: PRIORITY_LABEL[p],
      count: tasks.filter((t) => t.priority === p).length,
    }));
  }, [tasks]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done' && t.status !== 'missed' && t.deadline)
      .sort((a, b) => a.deadline.seconds - b.deadline.seconds)
      .slice(0, 5);
  }, [tasks]);

  const todayCount = useMemo(
    () => tasks.filter((t) => t.deadline && isToday(t.deadline.toDate())).length,
    [tasks],
  );

  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== 'done' && t.deadline && isPast(t.deadline.toDate()) && !isToday(t.deadline.toDate()),
      ).length,
    [tasks],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-blue-400" />
          Dashboard
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {user?.displayName ? `Hey ${user.displayName.split(' ')[0]} —` : 'Hey —'} here's your productivity overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Tasks" value={stats.total} icon={Target} color="bg-slate-600 text-slate-300" />
        <StatCard label="Completed" value={stats.done} sub={`${stats.completionRate}% rate`} icon={CheckCircle} color="bg-green-500/20 text-green-400" />
        <StatCard label="In Progress" value={stats.inProgress} sub={`${todayCount} due today`} icon={Clock} color="bg-blue-500/20 text-blue-400" />
        <StatCard label="Missed" value={stats.missed} sub={overdueCount > 0 ? `${overdueCount} overdue` : undefined} icon={AlertTriangle} color="bg-red-500/20 text-red-400" />
      </div>

      {/* Completion rate bar */}
      {stats.total > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Completion Rate
            </h2>
            <span className="text-lg font-bold text-white">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-700"
              // Runtime-dynamic percentage width based on current statistics,
              // which cannot be statically determined or mapped using static classes.
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {stats.done} of {stats.total} tasks completed · {stats.missed} missed · {stats.pending + stats.inProgress} remaining
          </p>
        </div>
      )}

      {/* Charts Row */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Pie */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Status Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              {statusChartData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                  {/* Runtime-dynamic status dot color matching the chart palette. */}
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_COLORS[d.name] }} />
                  <span className="capitalize">{d.name.replace('_', ' ')}</span>
                  <span className="text-slate-500">({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Bar */}
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-white mb-4">Tasks by Priority</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={priorityChartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((_, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-blue-400" />
            Upcoming Deadlines
          </h2>
          <ul className="space-y-2">
            {upcomingTasks.map((task) => {
              const date = task.deadline.toDate();
              const overdue = isPast(date) && !isToday(date);
              return (
                <li key={task.id}>
                  <Link
                    to={`/task/${task.id}`}
                    className="flex items-center justify-between px-4 py-2.5 bg-slate-900/40 hover:bg-slate-900/70 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          overdue ? 'bg-red-400 animate-pulse' : isToday(date) ? 'bg-amber-400' : 'bg-slate-500'
                        }`}
                      />
                      <span className="text-sm text-slate-200 truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span
                        className={`text-xs font-semibold ${
                          overdue ? 'text-red-400' : isToday(date) ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {overdue ? '⚠ Overdue' : isToday(date) ? 'Today' : format(date, 'MMM d')}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── Procrastination Pattern Analysis ──────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Procrastination Pattern Analysis
          </h2>
          <button
            id="analyze-patterns-btn"
            onClick={handleAnalyzePatterns}
            disabled={patternLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {patternLoading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…</>
              : <><Brain className="w-3.5 h-3.5" /> Analyse My Patterns</>}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Gemini reviews your last 30 days of completed and missed tasks and identifies one specific behavioral pattern — not a generic tip.
        </p>
        {patternResult && (
          <div className="bg-slate-900/60 border border-purple-500/20 rounded-xl p-4 space-y-2">
            <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">
              AI Diagnosis · {patternTaskCount} tasks analysed
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{patternResult}</p>
          </div>
        )}
      </div>

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="text-center py-16 text-slate-500">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold text-slate-400">No tasks yet</p>
          <p className="text-sm mt-1">Add your first task to start tracking your productivity.</p>
          <Link
            to="/tasks"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Add a Task
          </Link>
        </div>
      )}
    </div>
  );
}
