import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Timestamp } from 'firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';
import { createTask } from '../../lib/tasks';
import { classifyTask } from '../../lib/classifyTask';
import type { TaskType, Priority } from '../../types/Task';
import { Zap, Clock, Calendar, AlertCircle, Check, X } from 'lucide-react';
import Spinner from '../base/Spinner';

interface QuickAddInput {
  rawText: string;
}

interface ReviewFormInput {
  title: string;
  description: string;
  taskType: TaskType;
  priority: Priority;
  estimatedMinutes: number;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // HH:MM
}

export default function TaskForm() {
  const user = useAuthStore((s) => s.user);
  const [phase, setPhase] = useState<'input' | 'classifying' | 'review'>('input');
  const [rawCapturedText, setRawCapturedText] = useState('');

  // 1. Hook for the quick-add single text input
  const {
    register: registerQuick,
    handleSubmit: handleQuickSubmit,
    reset: resetQuick,
    formState: { errors: quickErrors },
  } = useForm<QuickAddInput>();

  // 2. Hook for the review and override fields
  const {
    register: registerReview,
    handleSubmit: handleReviewSubmit,
    setValue: setReviewValue,
    formState: { errors: reviewErrors },
  } = useForm<ReviewFormInput>();

  // Triggered when user enters freeform text
  const onQuickAdd = async (data: QuickAddInput) => {
    const text = data.rawText.trim();
    if (!text) return;

    setRawCapturedText(text);
    setPhase('classifying');

    try {
      const aiResult = await classifyTask(text);

      // Pre-populate review fields
      setReviewValue('title', aiResult.title);
      setReviewValue('description', text);
      setReviewValue('taskType', aiResult.taskType);
      setReviewValue('priority', aiResult.priority);
      setReviewValue('estimatedMinutes', aiResult.estimatedMinutes);

      // Format ISO deadline or default to tomorrow if none detected
      const dateToUse = aiResult.deadline ? aiResult.deadline.toDate() : new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const year = dateToUse.getFullYear();
      const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
      const day = String(dateToUse.getDate()).padStart(2, '0');
      const hours = String(dateToUse.getHours()).padStart(2, '0');
      const minutes = String(dateToUse.getMinutes()).padStart(2, '0');

      setReviewValue('deadlineDate', `${year}-${month}-${day}`);
      setReviewValue('deadlineTime', `${hours}:${minutes}`);

      setPhase('review');
    } catch {
      // Fallback in case of classification crash
      setReviewValue('title', text.slice(0, 50));
      setReviewValue('description', text);
      setReviewValue('taskType', 'general');
      setReviewValue('priority', 3);
      setReviewValue('estimatedMinutes', 60);
      setPhase('review');
    }
  };

  // Triggered when user clicks "Save Task"
  const onSaveTask = async (data: ReviewFormInput) => {
    if (!user) return;

    try {
      const deadlineDateObj = new Date(`${data.deadlineDate}T${data.deadlineTime}`);
      const deadlineTimestamp = Timestamp.fromDate(
        isNaN(deadlineDateObj.getTime()) ? new Date() : deadlineDateObj
      );

      await createTask({
        userId: user.uid,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        priority: data.priority,
        estimatedMinutes: Number(data.estimatedMinutes) || 30,
        deadline: deadlineTimestamp,
        source: 'manual',
      });

      // Reset flow back to input
      resetQuick();
      setPhase('input');
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleCancelReview = () => {
    setPhase('input');
    resetQuick();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      {/* ── Phase 1: Input text box ──────────────────────────────── */}
      {phase === 'input' && (
        <form onSubmit={handleQuickSubmit(onQuickAdd)} className="relative group">
          <div className="flex items-center bg-slate-800/60 border border-slate-700 hover:border-blue-500/50 focus-within:border-blue-500 rounded-xl px-4 py-2.5 transition-all duration-200 shadow-md">
            <Zap className="w-5 h-5 text-blue-400 mr-3 flex-shrink-0 animate-pulse" />
            <input
              {...registerQuick('rawText', { required: true })}
              type="text"
              placeholder="e.g. email draft for chemistry extension request due tomorrow at 5pm"
              className="w-full bg-transparent border-none text-white placeholder-slate-500 focus:outline-none focus:ring-0 text-sm"
              autoComplete="off"
            />
            <button
              type="submit"
              className="ml-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Add</span>
            </button>
          </div>
          {quickErrors.rawText && (
            <p role="alert" className="text-red-400 text-xs mt-1.5 flex items-center gap-1 px-1">
              <AlertCircle className="w-3.5 h-3.5" /> Please type a task description.
            </p>
          )}
        </form>
      )}

      {/* ── Phase 2: Classifying loader ──────────────────────────── */}
      {phase === 'classifying' && (
        <div className="bg-slate-850 border border-slate-800 rounded-2xl p-6 text-center shadow-lg animate-pulse flex flex-col items-center justify-center">
          <Spinner size="md" label="Gemini is analyzing urgency and duration..." />
          <p className="text-xs text-slate-500 mt-2 font-mono italic max-w-md truncate">
            &ldquo;{rawCapturedText}&rdquo;
          </p>
        </div>
      )}

      {/* ── Phase 3: Review / Edit panel ────────────────────────── */}
      {phase === 'review' && (
        <form
          onSubmit={handleReviewSubmit(onSaveTask)}
          className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-300 scale-98 sm:scale-100"
        >
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">AI Suggestion Review</h3>
            </div>
            <button
              type="button"
              onClick={handleCancelReview}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Cancel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-medium text-slate-400 mb-1">
                Task Title
              </label>
              <input
                id="title"
                {...registerReview('title', { required: 'Title is required' })}
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              {reviewErrors.title && (
                <p role="alert" className="text-red-400 text-xs mt-1">{reviewErrors.title.message}</p>
              )}
            </div>

            {/* Description (Preserved raw text) */}
            <div>
              <label htmlFor="description" className="block text-xs font-medium text-slate-400 mb-1">
                Task Description
              </label>
              <textarea
                id="description"
                {...registerReview('description')}
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Grid for Task Type, Priority, Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Task Type */}
              <div>
                <label htmlFor="taskType" className="block text-xs font-medium text-slate-400 mb-1">
                  Task Type
                </label>
                <select
                  id="taskType"
                  {...registerReview('taskType')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="assignment">Assignment</option>
                  <option value="email">Email</option>
                  <option value="meeting_prep">Meeting Prep</option>
                  <option value="exam_prep">Exam Prep</option>
                  <option value="bill_payment">Bill Payment</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label htmlFor="priority" className="block text-xs font-medium text-slate-400 mb-1">
                  Priority (1 = Low, 5 = Critical)
                </label>
                <select
                  id="priority"
                  {...registerReview('priority')}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="1">1 - Low</option>
                  <option value="2">2 - Normal</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Critical</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label htmlFor="estimatedMinutes" className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Duration (mins)
                </label>
                <input
                  id="estimatedMinutes"
                  {...registerReview('estimatedMinutes', {
                    required: 'Duration is required',
                    min: { value: 1, message: 'Minimum 1 minute' },
                  })}
                  type="number"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                {reviewErrors.estimatedMinutes && (
                  <p role="alert" className="text-red-400 text-xs mt-1">{reviewErrors.estimatedMinutes.message}</p>
                )}
              </div>
            </div>

            {/* Deadline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label htmlFor="deadlineDate" className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Deadline Date
                </label>
                <input
                  id="deadlineDate"
                  {...registerReview('deadlineDate', { required: 'Date is required' })}
                  type="date"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                {reviewErrors.deadlineDate && (
                  <p role="alert" className="text-red-400 text-xs mt-1">{reviewErrors.deadlineDate.message}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <label htmlFor="deadlineTime" className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Deadline Time
                </label>
                <input
                  id="deadlineTime"
                  {...registerReview('deadlineTime', { required: 'Time is required' })}
                  type="time"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                {reviewErrors.deadlineTime && (
                  <p role="alert" className="text-red-400 text-xs mt-1">{reviewErrors.deadlineTime.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 mt-6 border-t border-slate-700/60 pt-4">
            <button
              type="button"
              onClick={handleCancelReview}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Confirm & Save</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
