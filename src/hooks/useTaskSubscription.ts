import { useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useTaskStore } from '../stores/useTaskStore';
import { subscribeToUserTasks } from '../lib/tasks';

/**
 * Starts a Firestore real-time subscription to the current user's tasks.
 * Must be called from a component that is mounted only when the user is
 * authenticated (e.g. inside the protected Layout).
 *
 * Coding-style.md: "Real-time reads use onSnapshot, always unsubscribed
 * in the corresponding useEffect cleanup."
 */
export function useTaskSubscription(): void {
  const user = useAuthStore((s) => s.user);
  const setTasks = useTaskStore((s) => s.setTasks);
  const setLoading = useTaskStore((s) => s.setLoading);
  const setError = useTaskStore((s) => s.setError);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const unsubscribe = subscribeToUserTasks(
      user.uid,
      (tasks) => {
        setTasks(tasks);
        setLoading(false);
      },
      (err) => {
        setError(`Could not load tasks — ${err.message}`);
        setLoading(false);
      },
    );

    // Cleanup: unsubscribes the Firestore listener when the component unmounts
    // or when the user changes.
    return unsubscribe;
  }, [user, setTasks, setLoading, setError]);
}
