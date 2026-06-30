import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { createTask } from '../lib/tasks';
import { extractTasksFromAudio, type ExtractedTaskResult } from '../lib/voiceExtraction';
import type { TaskType, Priority } from '../types/Task';
import { Mic, Square, Trash2, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function Braindump() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // States
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'processing' | 'review'>('idle');
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [candidates, setCandidates] = useState<(ExtractedTaskResult & { selected: boolean })[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Check microphone permissions on mount
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then(() => {
        // Just checking if mediaDevices API is available
        setPermissionGranted(true);
      })
      .catch(() => {
        setPermissionGranted(false);
      });

    return () => {
      stopTimer();
    };
  }, []);

  const startTimer = () => {
    setRecordSeconds(0);
    timerRef.current = setInterval(() => {
      setRecordSeconds((prev) => {
        if (prev >= 59) {
          // Cap at 60 seconds
          stopRecording();
          return 60;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Start recording
  const startRecording = async () => {
    audioChunksRef.current = [];
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
        await processAudioBlob();
      };

      mediaRecorder.start();
      setRecordingState('recording');
      startTimer();
    } catch (err) {
      console.error('Error starting voice recorder:', err);
      setPermissionGranted(false);
      setRecordingState('idle');
      setErrorMessage('Microphone access denied. Please enable mic permissions in your browser.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Convert raw WebM blob to Base64 and call Gemini
  const processAudioBlob = async () => {
    setRecordingState('processing');
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

    if (audioBlob.size === 0) {
      setRecordingState('idle');
      setErrorMessage('No audio captured. Please try recording again.');
      return;
    }

    try {
      // Read blob as base64 data string
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const extracted = await extractTasksFromAudio(base64data);

        if (extracted.length === 0) {
          setRecordingState('idle');
          setErrorMessage('Could not extract any tasks. Speak clearly and try again.');
          return;
        }

        setCandidates(extracted.map((t) => ({ ...t, selected: true })));
        setRecordingState('review');
      };
    } catch (err) {
      console.error(err);
      setRecordingState('idle');
      setErrorMessage('Failed to process audio data. Please try again.');
    }
  };

  // Confirm and write checked tasks to Firestore
  const handleSaveTasks = async () => {
    if (!user) return;

    const selectedTasks = candidates.filter((c) => c.selected);
    if (selectedTasks.length === 0) return;

    try {
      for (const t of selectedTasks) {
        let deadlineTimestamp = Timestamp.now();
        if (t.deadlineIso) {
          const d = new Date(t.deadlineIso);
          if (!isNaN(d.getTime())) {
            deadlineTimestamp = Timestamp.fromDate(d);
          } else {
            // Default: tomorrow
            deadlineTimestamp = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
          }
        } else {
          // Default: tomorrow
          deadlineTimestamp = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
        }

        await createTask({
          userId: user.uid,
          title: t.title,
          description: `Extracted from voice braindump.`,
          taskType: t.taskType,
          priority: t.priority,
          estimatedMinutes: t.estimatedMinutes,
          deadline: deadlineTimestamp,
          source: 'voice',
        });
      }

      // Navigate back to Today
      navigate('/');
    } catch (err) {
      console.error('Failed to save spoken tasks:', err);
      setErrorMessage('Could not save tasks to database. Please check connection.');
    }
  };

  const toggleCandidateSelection = (index: number) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleUpdateCandidateField = <K extends keyof ExtractedTaskResult>(
    index: number,
    field: K,
    value: ExtractedTaskResult[K]
  ) => {
    setCandidates((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleDiscardCandidate = (index: number) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Mic className="w-6 h-6 text-blue-400" />
          <span>Voice Braindump</span>
        </h1>
        <p className="text-slate-400 text-xs mt-1">
          Speak freely about all your tasks (Hindi, English, or Hinglish). Gemini will extract separate items automatically.
        </p>
      </div>

      {errorMessage && (
        <div role="alert" className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── Mic Permission Denied State ───────────────────────────── */}
      {permissionGranted === false && (
        <div className="p-6 bg-slate-850 border border-slate-800 rounded-3xl text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Microphone Access Blocked</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
            DeadlineAI needs access to your microphone to capture voice recordings. Please update your browser permission settings to use this feature.
          </p>
        </div>
      )}

      {permissionGranted !== false && (
        <>
          {/* ── Idle State ─────────────────────────────────────────── */}
          {recordingState === 'idle' && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-800/10 border border-slate-800/50 border-dashed rounded-3xl p-8">
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                aria-label="Start recording"
              >
                <Mic className="w-8 h-8" />
              </button>
              <h3 className="text-base font-semibold text-white mt-4">Start recording your braindump</h3>
              <p className="text-slate-500 text-xs mt-1 text-center max-w-sm">
                Up to 60 seconds. Mention multiple tasks like &ldquo;finish lab assignment by tomorrow night, email Professor Dave, prep for chemistry exam on Friday.&rdquo;
              </p>
            </div>
          )}

          {/* ── Recording State ────────────────────────────────────── */}
          {recordingState === 'recording' && (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-850 border border-slate-800 rounded-3xl p-8 space-y-6">
              {/* Pulse ripple effect */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 bg-red-500/10 rounded-full animate-ping" />
                <button
                  onClick={stopRecording}
                  className="relative w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/25 transition-colors cursor-pointer"
                  aria-label="Stop recording"
                >
                  <Square className="w-7 h-7 fill-white" />
                </button>
              </div>

              <div className="text-center">
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  Listening…
                </span>
                <h3 className="text-2xl font-mono font-bold text-white mt-1">
                  00:{String(recordSeconds).padStart(2, '0')}
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Tap the button to finish. Recording will stop automatically at 60s.
                </p>
              </div>
            </div>
          )}

          {/* ── Processing State ───────────────────────────────────── */}
          {recordingState === 'processing' && (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-850 border border-slate-800 rounded-3xl p-8 space-y-3">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <h3 className="text-base font-semibold text-white">Gemini is processing your braindump</h3>
              <p className="text-slate-500 text-xs">
                Extracting separate task records and normalizing deadlines...
              </p>
            </div>
          )}

          {/* ── Review Candidates State ────────────────────────────── */}
          {recordingState === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold text-slate-400">
                  Extracted {candidates.length} tasks
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRecordingState('idle')}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Discard All
                  </button>
                  <button
                    onClick={handleSaveTasks}
                    disabled={candidates.filter((c) => c.selected).length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors shadow cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Create</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {candidates.map((cand, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-2xl p-4 bg-slate-850 transition-colors ${
                      cand.selected ? 'border-slate-700' : 'border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      {/* Checkbox */}
                      <label className="flex items-center gap-3 cursor-pointer select-none mt-1">
                        <input
                          type="checkbox"
                          checked={cand.selected}
                          onChange={() => toggleCandidateSelection(idx)}
                          className="w-4 h-4 rounded text-blue-500 bg-slate-900 border-slate-700 focus:ring-blue-500 focus:ring-offset-slate-900"
                        />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          Include Task
                        </span>
                      </label>

                      {/* Discard */}
                      <button
                        onClick={() => handleDiscardCandidate(idx)}
                        className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete candidate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* Title */}
                      <input
                        type="text"
                        value={cand.title}
                        onChange={(e) => handleUpdateCandidateField(idx, 'title', e.target.value)}
                        placeholder="Task title"
                        disabled={!cand.selected}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Task Type */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Type
                          </label>
                          <select
                            value={cand.taskType}
                            onChange={(e) =>
                              handleUpdateCandidateField(idx, 'taskType', e.target.value as TaskType)
                            }
                            disabled={!cand.selected}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
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
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Priority
                          </label>
                          <select
                            value={cand.priority}
                            onChange={(e) =>
                              handleUpdateCandidateField(
                                idx,
                                'priority',
                                Number(e.target.value) as Priority
                              )
                            }
                            disabled={!cand.selected}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="1">P1 - Low</option>
                            <option value="2">P2 - Normal</option>
                            <option value="3">P3 - Medium</option>
                            <option value="4">P4 - High</option>
                            <option value="5">P5 - Critical</option>
                          </select>
                        </div>

                        {/* Duration */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Duration (mins)
                          </label>
                          <input
                            type="number"
                            value={cand.estimatedMinutes}
                            onChange={(e) =>
                              handleUpdateCandidateField(
                                idx,
                                'estimatedMinutes',
                                Math.max(1, Number(e.target.value) || 30)
                              )
                            }
                            disabled={!cand.selected}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
