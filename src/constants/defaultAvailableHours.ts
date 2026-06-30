/** Default number of productive hours available per day. */
export const DEFAULT_AVAILABLE_HOURS = 8;

/**
 * Per-day-of-week available hours.
 * Key: 0 = Sunday … 6 = Saturday
 * Can be overridden by the user's stored preference in the users Firestore document.
 */
export const DEFAULT_WEEKLY_HOURS: Record<number, number> = {
  0: 4,  // Sunday
  1: 8,  // Monday
  2: 8,  // Tuesday
  3: 8,  // Wednesday
  4: 8,  // Thursday
  5: 8,  // Friday
  6: 4,  // Saturday
};
