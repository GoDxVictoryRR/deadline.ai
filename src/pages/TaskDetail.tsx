import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/useTaskStore';
import { getTask, updateTask, deleteTask } from '../lib/tasks';
import { draftEmailDeliverable, draftOutlineDeliverable } from '../lib/drafting';
import { downloadICS } from '../lib/icsExport';
import type { Task } from '../types/Task';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft, Mail, FileText, Users, BookOpen, CreditCard,
  CheckSquare, Loader2, CheckCircle, Play, Clock, Trash2,
  Bell, Save, Copy, ExternalLink, ChevronDown, ChevronUp, CalendarArrowDown,
} from 'lucide-react';
import Badge from '../components/base/Badge';


const TYPE_ICONS: Record<string, typeof Mail> = {
  assignment: FileText,
  email: Mail,
  meeting_prep: Users,
  exam_prep: BookOpen,
  bill_payment: CreditCard,
  general: CheckSquare,
};

const PRIORITY_LABELS: Record<number, string> = {
  1: 'Low', 2: 'Normal', 3: 'Medium', 4: 'High', 5: 'Critical',
};

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-green-400', 2: 'text-green-400',
  3: 'text-amber-400', 4: 'text-red-400', 5: 'text-red-400',
};

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const storeTasks = useTaskStore((s) => s.tasks);

  const [task, setTask] = useState<Task | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);

  // Draft states
  const [draftType, setDraftType] = useState<'email' | 'outline' | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [showDraft, setShowDraft] = useState(true);

  // Accountability form states
  const [contactEmail, setContactEmail] = useState('');
  const [checkpointPercent, setCheckpointPercent] = useState(50);
  const [checkpointDate, setCheckpointDate] = useState('');
  const [checkpointTime, setCheckpointTime] = useState('');
  const [accountabilitySaving, setAccountabilitySaving] = useState(false);
  const [accountabilitySaved, setAccountabilitySaved] = useState(false);

  // Load task — first from store (instant), fallback to Firestore
  useEffect(() => {
    if (!id) return;
    const storeTask = storeTasks.find((t) => t.id === id);
    if (storeTask) {
      setTask(storeTask);
      populateAccountabilityForm(storeTask);
      populateDraftState(storeTask);
      setLoadingTask(false);
    } else {
      getTask(id).then((t) => {
        if (t) {
          setTask(t);
          populateAccountabilityForm(t);
          populateDraftState(t);
        }
        setLoadingTask(false);
      });
    }
  }, [id, storeTasks]);

  function populateAccountabilityForm(t: Task) {
    setContactEmail(t.accountabilityContactEmail ?? '');
    setCheckpointPercent(t.checkpointPercent ?? 50);
    if (t.checkpointTime) {
      const d = t.checkpointTime.toDate();
      setCheckpointDate(format(d, 'yyyy-MM-dd'));
      setCheckpointTime(format(d, 'HH:mm'));
    }
  }

  function populateDraftState(t: Task) {
    if (t.draftContent) {
      setDraftContent(t.draftContent);
      setDraftType((t.draftType as 'email' | 'outline') ?? null);
      setDraftSaved(true);
    }
  }

  const handleStatusChange = async (status: Task['status']) => {
    if (!task) return;
    await updateTask(task.id, { status });
    setTask((prev) => prev ? { ...prev, status } : prev);
  };

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task permanently?')) return;
    await deleteTask(task.id);
    navigate('/tasks');
  };

  const handleGenerateDraft = async (type: 'email' | 'outline') => {
    if (!task) return;
    setDraftLoading(true);
    setDraftType(type);
    setDraftSaved(false);
    setDraftContent(null);

    try {
      if (type === 'email') {
        const result = await draftEmailDeliverable(task.title, task.description);
        setDraftSubject(result.subject);
        setDraftContent(result.body);
      } else {
        const outline = await draftOutlineDeliverable(task.title, task.description);
        setDraftContent(outline);
        setDraftSubject(null);
      }
      setShowDraft(true);
    } finally {
      setDraftLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!task || !draftContent) return;
    await updateTask(task.id, {
      draftContent,
      draftType: draftType as Task['draftType'],
    });
    setDraftSaved(true);
  };

  const handleCopyDraft = () => {
    if (draftContent) {
      const text = draftType === 'email' && draftSubject
        ? `Subject: ${draftSubject}\n\n${draftContent}`
        : draftContent;
      navigator.clipboard.writeText(text);
    }
  };

  const handleMailtoLink = () => {
    if (!task || !draftContent || draftType !== 'email') return;
    const subject = encodeURIComponent(draftSubject ?? task.title);
    const body = encodeURIComponent(draftContent);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleSaveAccountability = async () => {
    if (!task) return;
    setAccountabilitySaving(true);
    const updates: Partial<Task> = {
      accountabilityContactEmail: contactEmail || undefined,
      checkpointPercent: checkpointPercent,
    };
    if (checkpointDate && checkpointTime) {
      updates.checkpointTime = Timestamp.fromDate(new Date(`${checkpointDate}T${checkpointTime}`));
    }
    await updateTask(task.id, updates);
    setTask((prev) => prev ? { ...prev, ...updates } : prev);
    setAccountabilitySaving(false);
    setAccountabilitySaved(true);
    setTimeout(() => setAccountabilitySaved(false), 2000);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingTask) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-white">Task not found</h2>
        <button onClick={() => navigate('/tasks')} className="mt-4 text-blue-400 hover:underline text-sm">
          ← Back to Tasks
        </button>
      </div>
    );
  }

  const Icon = TYPE_ICONS[task.taskType] ?? CheckSquare;
  const deadlineDate = task.deadline?.toDate() ?? new Date();
  const isOverdue = deadlineDate < new Date() && task.status !== 'done';
  const hoursUntilDeadline = (deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60);
  // Features.md: draft available when within 3h of deadline or urgent priority (≥4)
  // Also always shown when a draft already exists (review mode) or within 24h for UX.
  const draftEligible =
    task.draftContent != null ||
    task.priority >= 4 ||
    hoursUntilDeadline <= 24;
  const showEmailDraft = draftEligible && ['email', 'assignment', 'general'].includes(task.taskType);
  const showOutlineDraft = draftEligible && ['assignment', 'exam_prep', 'meeting_prep', 'general'].includes(task.taskType);
  // Label shows urgency context
  const draftUrgencyLabel =
    hoursUntilDeadline <= 3 ? '⚡ Urgent —' :
    hoursUntilDeadline <= 24 ? '⏰ Due soon —' :
    task.priority >= 4 ? '🔴 High priority —' : '';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* ── Back + Actions header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors text-xs px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Task
        </button>
      </div>

      {/* ── Task Info Card ────────────────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-slate-700/50 rounded-xl text-slate-400 flex-shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white leading-tight">{task.title}</h1>
            {task.description && (
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">{task.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-700/50">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Status</span>
            <Badge color={task.status === 'done' ? 'green' : task.status === 'in_progress' ? 'blue' : task.status === 'missed' ? 'red' : 'gray'}>
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Priority</span>
            <span className={`text-sm font-bold ${PRIORITY_COLORS[task.priority]}`}>
              P{task.priority} — {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Duration</span>
            <span className="text-sm text-white flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />{task.estimatedMinutes}m
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Deadline</span>
            <span className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-white'}`}>
              {formatDistanceToNow(deadlineDate, { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Quick Status Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
          {task.status === 'pending' && (
            <button onClick={() => handleStatusChange('in_progress')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
              <Play className="w-3.5 h-3.5 fill-white" /> Start Working
            </button>
          )}
          {task.status !== 'done' && (
            <button onClick={() => handleStatusChange('done')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors">
              <CheckCircle className="w-3.5 h-3.5" /> Mark Done
            </button>
          )}
          {task.status !== 'missed' && task.status !== 'done' && (
            <button onClick={() => handleStatusChange('missed')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors">
              Mark Missed
            </button>
          )}
          {/* ICS Calendar Export — client-side only, no external service */}
          <button
            onClick={() => downloadICS(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg transition-colors ml-auto"
            title="Export as .ics calendar file"
          >
            <CalendarArrowDown className="w-3.5 h-3.5" /> Export .ics
          </button>
        </div>
      </div>

      {/* ── AI Deliverable Drafting ───────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            AI Deliverable Drafting
          </h2>
          {(showEmailDraft || showOutlineDraft) && (
            <p className="text-xs text-slate-500 mt-1">
              {draftUrgencyLabel && <span className="text-amber-400 font-semibold">{draftUrgencyLabel} </span>}
              AI Draft — Review Before Sending
            </p>
          )}
          {!draftEligible && (
            <p className="text-xs text-slate-500 mt-1">
              Draft buttons unlock when this task is due within 24 hours or is marked high priority.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {showEmailDraft && (
            <button onClick={() => handleGenerateDraft('email')} disabled={draftLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-colors">
              {draftLoading && draftType === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Draft Email
            </button>
          )}
          {showOutlineDraft && (
            <button onClick={() => handleGenerateDraft('outline')} disabled={draftLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:text-slate-500 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
              {draftLoading && draftType === 'outline' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Generate Outline
            </button>
          )}
        </div>

        {/* Generated Draft Display */}
        {draftContent && (
          <div className="border border-slate-700 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900/50 px-4 py-2.5 border-b border-slate-700">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {draftType === 'email' ? '📧 Email Draft' : '📋 Outline'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowDraft((v) => !v)}
                  className="text-slate-500 hover:text-slate-300 transition-colors">
                  {showDraft ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {showDraft && (
              <div className="p-4 space-y-3">
                {draftType === 'email' && draftSubject && (
                  <div className="text-xs text-slate-400 font-mono bg-slate-900/40 px-3 py-2 rounded-lg">
                    <span className="text-slate-500 mr-2">Subject:</span>
                    <span className="text-slate-200">{draftSubject}</span>
                  </div>
                )}
                <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-sans max-h-72 overflow-y-auto">
                  {draftContent}
                </pre>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                  <button onClick={handleCopyDraft}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </button>
                  {draftType === 'email' && (
                    <button onClick={handleMailtoLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Open in Mail App
                    </button>
                  )}
                  <button onClick={handleSaveDraft} disabled={draftSaved}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-semibold rounded-lg transition-colors ml-auto">
                    {draftSaved ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save Draft</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Accountability Settings ───────────────────────────────── */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          Accountability Partner
        </h2>
        <p className="text-xs text-slate-400">
          Set a contact email and a progress checkpoint. If you miss the checkpoint, DeadlineAI will automatically email them.
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-400 mb-1">
              Contact Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="friend@example.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cp-percent" className="block text-xs font-semibold text-slate-400 mb-1">
                Progress Goal
              </label>
              <select
                id="cp-percent"
                value={checkpointPercent}
                onChange={(e) => setCheckpointPercent(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value={25}>25% done</option>
                <option value={50}>50% done</option>
                <option value={75}>75% done</option>
              </select>
            </div>
            <div>
              <label htmlFor="cp-date" className="block text-xs font-semibold text-slate-400 mb-1">
                Checkpoint Date
              </label>
              <input
                id="cp-date"
                type="date"
                value={checkpointDate}
                onChange={(e) => setCheckpointDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="cp-time" className="block text-xs font-semibold text-slate-400 mb-1">
                Checkpoint Time
              </label>
              <input
                id="cp-time"
                type="time"
                value={checkpointTime}
                onChange={(e) => setCheckpointTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={handleSaveAccountability}
            disabled={accountabilitySaving || !contactEmail}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold rounded-lg transition-colors"
          >
            {accountabilitySaving
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : accountabilitySaved
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <Save className="w-3.5 h-3.5" />
            }
            {accountabilitySaved ? 'Saved!' : 'Save Accountability Settings'}
          </button>
        </div>
      </div>

      {/* ── AI Reasoning Log ─────────────────────────────────────── */}
      {task.aiReasoningLog && task.aiReasoningLog.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            AI Reasoning Log
          </h2>
          <ul className="space-y-2">
            {task.aiReasoningLog.map((entry, i) => (
              <li key={i} className="text-xs text-slate-400 font-mono bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-800">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
