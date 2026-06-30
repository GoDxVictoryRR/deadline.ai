import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { CheckCircle2, Zap } from 'lucide-react';
import { auth } from '../lib/firebase';

const features = [
  'Gemini 2.0 Flash classifies every task instantly',
  'Tells you if today is actually achievable',
  'Autonomously replans your day when tasks go off-track',
  'Sends accountability emails when you fall behind',
];

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // App.tsx onAuthStateChanged handles the redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed — please try again');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient gradient */}
      <div
        className="absolute inset-0 pointer-events-none bg-login-gradient"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <Zap className="w-7 h-7 text-blue-400" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">DeadlineAI</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
              Autonomous Productivity
            </p>
          </div>
        </div>

        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
            Your AI has been
            <br />
            <span className="text-blue-400">working while you weren&apos;t.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            DeadlineAI doesn&apos;t just remind you — it plans, prioritizes, drafts
            deliverables, and holds you accountable.
          </p>
        </div>

        {/* Feature bullets */}
        <ul className="space-y-2.5 mb-10" aria-label="Key features">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
              <CheckCircle2
                className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              {f}
            </li>
          ))}
        </ul>

        {/* Sign-in button */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            <>
              {/* Google G mark */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400 text-center">
            {error}
          </p>
        )}

        <p className="mt-8 text-xs text-slate-600 text-center">
          BlockseBlock Hackathon · Problem Statement 1: The Last-Minute Life Saver
        </p>
      </div>
    </div>
  );
}
