import { Outlet } from 'react-router-dom';
import Nav from './Nav';
import { useTaskSubscription } from '../../hooks/useTaskSubscription';
import { useAccountabilityChecker } from '../../hooks/useAccountabilityChecker';

/**
 * Rendered only for authenticated users (enforced in App.tsx).
 * Starts the Firestore task subscription once for the entire authenticated session.
 */
export default function Layout() {
  // Start real-time task listener for all pages — cleanup is handled inside the hook
  useTaskSubscription();
  
  // Start background accountability checks
  useAccountabilityChecker();

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Nav />
      {/* pb-16 on mobile reserves space above the bottom tab bar (h-16) */}
      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
