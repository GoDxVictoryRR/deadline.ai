import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

// ---------------------------------------------------------------------------
// UserProfile — stored at users/{uid} in Firestore.
// Spark plan-safe: no Cloud Functions required; reads/writes directly from
// the browser under the authenticated user's UID.
// ---------------------------------------------------------------------------

export interface UserProfile {
  uid: string;
  /** Hours per day the user is available to work (used by feasibility engine). */
  availableHoursPerDay: number;
  /** Default accountability contact email (can be overridden per-task). */
  defaultAccountabilityEmail?: string;
  /** Google Apps Script Web App URL for sending accountability emails. */
  appsScriptWebhookUrl?: string;
  updatedAt?: ReturnType<typeof serverTimestamp>;
}

const col = 'users';

/** One-time fetch of the user profile. Returns sensible defaults if not found. */
export async function getUserProfile(uid: string): Promise<UserProfile> {
  const snap = await getDoc(doc(db, col, uid));
  if (snap.exists()) {
    return { uid, ...snap.data() } as UserProfile;
  }
  // Return defaults — no document yet
  return { uid, availableHoursPerDay: 8 };
}

/** Upsert the user profile document (merge-safe). */
export async function saveUserProfile(
  uid: string,
  updates: Partial<Omit<UserProfile, 'uid'>>,
): Promise<void> {
  await setDoc(
    doc(db, col, uid),
    { ...updates, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
