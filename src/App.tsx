import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './stores/useAuthStore';
import { useSettingsStore } from './stores/useSettingsStore';
import { getUserProfile } from './lib/userProfile';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Today from './pages/Today';
import Tasks from './pages/Tasks';
import TaskDetail from './pages/TaskDetail';
import Braindump from './pages/Braindump';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

export default function App() {
  const { user, loading, setUser, setLoading } = useAuthStore();
  const setDefaultAvailableHours = useSettingsStore((s) => s.setDefaultAvailableHours);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useEffect(() => {
    setLoading(true);

    // Safety net: if Firebase hasn't resolved auth within 8 seconds, show error.
    const timeout = setTimeout(() => setAuthTimedOut(true), 8000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeout);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setDefaultAvailableHours(profile.availableHoursPerDay ?? 8);
        } catch {
          // Silently fall back to the default 8 hours.
        }
      }
    });
    return () => { clearTimeout(timeout); unsubscribe(); };
  }, [setUser, setLoading, setDefaultAvailableHours]);

  if (authTimedOut) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-red-400 text-5xl">⚠</div>
        <h1 className="text-white text-xl font-bold">Could not connect to Firebase</h1>
        <p className="text-slate-400 text-sm text-center max-w-sm">
          Authentication timed out. Check your internet connection, then refresh.
          If this persists, the Firebase project may not be fully configured.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Waking up your companion…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={user ? <Layout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Today />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="task/:id" element={<TaskDetail />} />
          <Route path="braindump" element={<Braindump />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
