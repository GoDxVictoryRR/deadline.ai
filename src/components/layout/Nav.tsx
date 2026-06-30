import { NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Zap, CalendarCheck, ListTodo, Mic, BarChart2, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../stores/useAuthStore';

const links = [
  { to: '/',          label: 'Today',     Icon: CalendarCheck },
  { to: '/tasks',     label: 'Tasks',     Icon: ListTodo      },
  { to: '/braindump', label: 'Braindump', Icon: Mic           },
  { to: '/dashboard', label: 'Dashboard', Icon: BarChart2     },
];

const activeClass = 'text-blue-400';
const inactiveClass = 'text-slate-400 hover:text-slate-200';

export default function Nav() {
  const user = useAuthStore((s) => s.user);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <>
      {/* ── Desktop top nav ──────────────────────────────────────── */}
      <header className="hidden sm:flex items-center justify-between px-6 h-14 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-40">
        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" aria-hidden="true" />
          <span className="font-bold text-white tracking-tight">DeadlineAI</span>
        </NavLink>

        {/* Nav links */}
        <nav className="flex items-center gap-1" aria-label="Main navigation">
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? activeClass + ' bg-blue-500/10' : inactiveClass}`
              }
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign out */}
        <div className="flex items-center gap-3">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName ?? 'User avatar'}
              className="w-7 h-7 rounded-full ring-1 ring-slate-600"
            />
          )}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      {/* design.md: "bottom tab bar with the same four destinations plus
          a prominent center '+' quick-add button." */}
      <nav
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 bg-slate-800/90 backdrop-blur-md border-t border-slate-700/50"
        aria-label="Mobile navigation"
      >
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg min-w-[44px] min-h-[44px] justify-center transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`
            }
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
