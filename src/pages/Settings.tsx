import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { getUserProfile, saveUserProfile } from '../lib/userProfile';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import {
  Save, LogOut, CheckCircle, Loader2, Settings2,
  Clock, Bell, Link2, User, Database, Check,
} from 'lucide-react';
import { seedDemoTasks } from '../lib/seed';

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setDefaultAvailableHours = useSettingsStore((s) => s.setDefaultAvailableHours);
  const navigate = useNavigate();

  const [availableHours, setAvailableHours] = useState(8);
  const [globalEmail, setGlobalEmail] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing profile from Firestore
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((profile) => {
      setAvailableHours(profile.availableHoursPerDay ?? 8);
      setGlobalEmail(profile.defaultAccountabilityEmail ?? '');
      setWebhookUrl(profile.appsScriptWebhookUrl ?? '');
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load profile:', err);
      setError('Could not load profile settings from Firestore. Check database status or permissions.');
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await saveUserProfile(user.uid, {
        availableHoursPerDay: availableHours,
        defaultAccountabilityEmail: globalEmail || undefined,
        appsScriptWebhookUrl: webhookUrl || undefined,
      });
      // Sync Zustand so the feasibility engine picks up the new hours immediately.
      setDefaultAvailableHours(availableHours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Save failed:', err);
      setError(err?.message || 'Failed to save settings. Please verify Firestore exists and Rules are deployed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    setSeedLoading(true);
    setError(null);
    try {
      await seedDemoTasks(user.uid);
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Seeding failed:', err);
      setError(err?.message || 'Failed to seed tasks. Check Firestore rules or collection access.');
    } finally {
      setSeedLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    await signOut(auth);
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-blue-400" />
          Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">Customize DeadlineAI to fit your schedule and workflow.</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      {/* Account Info */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-slate-400" />
          Account
        </h2>
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-slate-600" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
              {user?.displayName?.[0] ?? user?.email?.[0] ?? '?'}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-white">{user?.displayName ?? 'User'}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Schedule Preferences */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          Schedule Preferences
        </h2>
        <div>
          <label htmlFor="available-hours" className="block text-xs font-semibold text-slate-400 mb-2">
            Available Hours per Day
            <span className="ml-2 text-white font-bold">{availableHours}h</span>
          </label>
          <input
            id="available-hours"
            type="range"
            min={1}
            max={16}
            step={0.5}
            value={availableHours}
            onChange={(e) => setAvailableHours(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>1h</span><span>8h</span><span>16h</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            The feasibility engine uses this to calculate whether your task schedule is realistic.
          </p>
        </div>
      </div>

      {/* Accountability */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          Global Accountability Settings
        </h2>
        <p className="text-xs text-slate-400">
          Set a default accountability partner for all tasks. This can be overridden per-task in the Task Detail view.
        </p>
        <div>
          <label htmlFor="global-email" className="block text-xs font-semibold text-slate-400 mb-1">
            Default Accountability Contact Email
          </label>
          <input
            id="global-email"
            type="email"
            value={globalEmail}
            onChange={(e) => setGlobalEmail(e.target.value)}
            placeholder="partner@example.com"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Apps Script Integration */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Link2 className="w-4 h-4 text-green-400" />
          Email Integration
        </h2>
        <p className="text-xs text-slate-400">
          DeadlineAI sends accountability emails via a Google Apps Script Web App (free, no backend required). 
          Paste your deployed Web App URL below.
        </p>
        <div>
          <label htmlFor="webhook-url" className="block text-xs font-semibold text-slate-400 mb-1">
            Apps Script Web App URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/.../exec"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <details className="group">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 transition-colors select-none">
            ▶ How to set up the Apps Script Web App
          </summary>
          <div className="mt-3 text-xs text-slate-400 space-y-2 pl-3 border-l border-slate-700">
            <p>1. Go to <strong className="text-slate-300">script.google.com</strong> and create a new project.</p>
            <p>2. Paste the following code into Code.gs:</p>
            <pre className="bg-slate-900 text-slate-300 rounded-lg p-3 text-[11px] overflow-x-auto">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  MailApp.sendEmail({
    to: data.to,
    subject: data.subject,
    body: data.body
  });
  return ContentService
    .createTextOutput('ok')
    .setMimeType(ContentService.MimeType.TEXT);
}`}
            </pre>
            <p>3. Click <strong className="text-slate-300">Deploy → New deployment</strong>. Select <em>Web app</em>.</p>
            <p>4. Set <strong className="text-slate-300">Execute as: Me</strong> and <strong className="text-slate-300">Who has access: Anyone</strong>.</p>
            <p>5. Copy the Web App URL and paste it above.</p>
          </div>
        </details>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-colors text-sm"
      >
        {saving
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          : saved
            ? <><CheckCircle className="w-4 h-4" /> Saved!</>
            : <><Save className="w-4 h-4" /> Save Settings</>
        }
      </button>

      {/* Developer & Demo Tools */}
      <div className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-purple-400" />
          Developer &amp; Demo Tools
        </h2>
        <p className="text-xs text-slate-400">
          Seed 15-20 realistic completed, missed, overdue, and overloaded tasks spanning the past 30 days to preview the Dashboard and Reality Engine.
        </p>
        <button
          onClick={handleSeedData}
          disabled={seedLoading}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-900/40 hover:bg-purple-900/60 disabled:bg-slate-700 disabled:text-slate-500 text-purple-300 hover:text-purple-200 font-bold border border-purple-500/20 hover:border-purple-500/40 rounded-xl transition-all duration-200 text-xs"
        >
          {seedLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Seeding Tasks…</>
          ) : seedSuccess ? (
            <><Check className="w-4 h-4 text-green-400" /> Successfully Seeded 18 Tasks!</>
          ) : (
            <><Database className="w-4 h-4" /> Seed 18 Demo Tasks</>
          )}
        </button>
      </div>

      {/* Sign Out */}
      <div className="border-t border-slate-800 pt-4">
        <button
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm font-semibold"
        >
          {signOutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Sign Out
        </button>
      </div>
    </div>
  );
}
