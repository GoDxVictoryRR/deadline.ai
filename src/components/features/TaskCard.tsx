import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import type { Task, Priority } from '../../types/Task';
import { FileText, Mail, Users, BookOpen, CreditCard, CheckSquare, Clock } from 'lucide-react';
import Badge from '../base/Badge';

interface TaskCardProps {
  task: Task;
}

const typeIconMap = {
  assignment: FileText,
  email: Mail,
  meeting_prep: Users,
  exam_prep: BookOpen,
  bill_payment: CreditCard,
  general: CheckSquare,
};

// Priority border colors per design.md:
// "Priority colour mapping (consistent everywhere): priority 1-2 green, 3 amber, 4-5 red."
const priorityBorderMap: Record<Priority, string> = {
  1: 'border-l-green-500',
  2: 'border-l-green-500',
  3: 'border-l-amber-500',
  4: 'border-l-red-500',
  5: 'border-l-red-500',
};

export default function TaskCard({ task }: TaskCardProps) {
  const navigate = useNavigate();
  const Icon = typeIconMap[task.taskType] || CheckSquare;

  const deadlineDate = task.deadline?.toDate() ?? new Date();
  const isOverdue = deadlineDate.getTime() < Date.now() && task.status !== 'done';
  
  // Format relative deadline string
  let relativeDeadline = '';
  try {
    const distance = formatDistanceToNow(deadlineDate, { addSuffix: true });
    relativeDeadline = isOverdue ? `Overdue ${distance}` : `Due ${distance}`;
  } catch {
    relativeDeadline = 'No deadline';
  }

  // Choose status badge color
  let statusColor: 'blue' | 'green' | 'amber' | 'red' | 'gray' = 'gray';
  if (task.status === 'done') statusColor = 'green';
  else if (task.status === 'in_progress') statusColor = 'blue';
  else if (task.status === 'missed') statusColor = 'red';
  else if (task.status === 'rescheduled') statusColor = 'amber';

  const handleClick = () => {
    navigate(`/task/${task.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600/70 border-l-4 ${
        priorityBorderMap[task.priority]
      } rounded-xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:-translate-y-[1px] shadow-sm hover:shadow-md`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Task Type Icon */}
        <div className="p-2 bg-slate-700/40 rounded-lg text-slate-400">
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>

        {/* Task Details */}
        <div className="min-w-0">
          <h4 className="font-semibold text-slate-100 text-sm truncate">{task.title}</h4>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-slate-400">
            <span className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-400'}>
              {relativeDeadline}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {task.estimatedMinutes}m
            </span>
            {task.source === 'voice' && (
              <>
                <span>•</span>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono">
                  Voice
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badges / Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge color={statusColor}>{task.status.replace('_', ' ')}</Badge>
        <span className="text-xs font-bold text-slate-500 bg-slate-900/50 px-2 py-1 rounded">
          P{task.priority}
        </span>
      </div>
    </div>
  );
}
