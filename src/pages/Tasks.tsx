import { useState } from 'react';
import { useTaskStore } from '../stores/useTaskStore';
import { updateTask, deleteTask } from '../lib/tasks';
import TaskCard from '../components/features/TaskCard';
import Badge from '../components/base/Badge';
import { Search, Filter, Trash2, CheckCircle2, Play, AlertCircle } from 'lucide-react';
import type { TaskStatus, Priority } from '../types/Task';

export default function Tasks() {
  const { tasks, loading } = useTaskStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 0>(0); // 0 means all

  // Filter tasks based on status, priority, and search text
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 0 || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleStart = async (id: string) => {
    await updateTask(id, { status: 'in_progress' });
  };

  const handleComplete = async (id: string) => {
    await updateTask(id, { status: 'done' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Full Task List</h1>
          <p className="text-slate-400 text-xs mt-1">
            Browse, search, and manage all your productivity deadlines.
          </p>
        </div>

        {/* Priority breakdown badges */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Pending load:</span>
          <Badge color="red">
            P4-5: {tasks.filter((t) => t.status !== 'done' && t.priority >= 4).length}
          </Badge>
          <Badge color="amber">
            P3: {tasks.filter((t) => t.status !== 'done' && t.priority === 3).length}
          </Badge>
          <Badge color="green">
            P1-2: {tasks.filter((t) => t.status !== 'done' && t.priority <= 2).length}
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-800/40 p-4 border border-slate-700/50 rounded-2xl shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Completed</option>
            <option value="missed">Missed</option>
            <option value="rescheduled">Rescheduled</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 flex-shrink-0">Priority</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(Number(e.target.value) as Priority | 0)}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="0">All Priorities</option>
            <option value="1">P1 - Low</option>
            <option value="2">P2 - Normal</option>
            <option value="3">P3 - Medium</option>
            <option value="4">P4 - High</option>
            <option value="5">P5 - Critical</option>
          </select>
        </div>
      </div>

      {/* Main Task List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/10 border border-dashed border-slate-800 rounded-3xl p-8">
          <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-white">No tasks match your filters</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mt-1">
            Try adjusting your search keywords, status filter, or priority levels.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="group relative flex flex-col justify-between bg-slate-800/30 hover:bg-slate-800/50 rounded-xl border border-slate-700/40 p-4 transition-all duration-200"
            >
              <TaskCard task={task} />
              
              {/* Task inline utility toolbar */}
              <div className="flex items-center justify-between border-t border-slate-700/30 pt-3 mt-3">
                <span className="text-[10px] text-slate-500 font-mono capitalize">
                  Type: {task.taskType.replace('_', ' ')}
                </span>
                
                <div className="flex items-center gap-2">
                  {task.status === 'pending' && (
                    <button
                      onClick={() => handleStart(task.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 px-2 py-1 rounded cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-blue-400" />
                      <span>Start</span>
                    </button>
                  )}
                  {task.status !== 'done' && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-green-400 hover:text-green-300 transition-colors bg-green-500/10 px-2 py-1 rounded cursor-pointer"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Done</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-2 py-1 rounded cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
