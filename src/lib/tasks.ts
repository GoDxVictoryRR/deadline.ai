import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Timestamp,
  type FirestoreDataConverter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Task } from '../types/Task';

// ---------------------------------------------------------------------------
// Typed converter — every Firestore read returns Task, never raw DocumentData.
// Coding-style.md: "Use typed converters (withConverter) so every Firestore
// read returns the correct TypeScript interface rather than untyped DocumentData."
// ---------------------------------------------------------------------------

const taskConverter: FirestoreDataConverter<Task> = {
  toFirestore(task: Task): DocumentData {
    // id lives on the document reference, not the stored fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...fields } = task;
    return fields as DocumentData;
  },
  fromFirestore(snap: QueryDocumentSnapshot): Task {
    const d = snap.data();
    return {
      id: snap.id,
      userId: d['userId'] as string,
      title: d['title'] as string,
      description: (d['description'] as string) ?? '',
      taskType: d['taskType'] as Task['taskType'],
      priority: (d['priority'] as Task['priority']) ?? 3,
      estimatedMinutes: (d['estimatedMinutes'] as number) ?? 60,
      deadline: d['deadline'] as Timestamp,
      status: (d['status'] as Task['status']) ?? 'pending',
      createdAt: d['createdAt'] as Timestamp,
      updatedAt: d['updatedAt'] as Timestamp,
      source: (d['source'] as Task['source']) ?? 'manual',
      checkpointPercent: d['checkpointPercent'] as number | undefined,
      checkpointTime: d['checkpointTime'] as Timestamp | undefined,
      checkpointMet: (d['checkpointMet'] as boolean | null) ?? null,
      rescheduledFromDate: d['rescheduledFromDate'] as Timestamp | undefined,
      draftContent: d['draftContent'] as string | undefined,
      draftType: d['draftType'] as Task['draftType'] | undefined,
      accountabilityContactEmail: d['accountabilityContactEmail'] as string | undefined,
      aiReasoningLog: (d['aiReasoningLog'] as string[]) ?? [],
    };
  },
};

const tasksCol = collection(db, 'tasks');

// ---------------------------------------------------------------------------
// Subscription — real-time onSnapshot.
// SKILL.md: "Real-time listeners must always unsubscribe; every component
// using onSnapshot needs a return cleanup function in its useEffect."
// Sort client-side to avoid needing a Firestore composite index at setup time.
// ---------------------------------------------------------------------------

export function subscribeToUserTasks(
  userId: string,
  onData: (tasks: Task[]) => void,
  onError: (err: Error) => void,
): () => void {
  const q = query(
    tasksCol.withConverter(taskConverter),
    where('userId', '==', userId),
  );
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => d.data());
      // Sort by deadline ascending client-side to avoid a composite index
      tasks.sort((a, b) => {
        const aMs = a.deadline?.seconds ?? 0;
        const bMs = b.deadline?.seconds ?? 0;
        return aMs - bMs;
      });
      onData(tasks);
    },
    (err) => onError(err as Error),
  );
}

// ---------------------------------------------------------------------------
// CRUD helpers
// ---------------------------------------------------------------------------

export interface CreateTaskInput {
  userId: string;
  title: string;
  description: string;
  taskType: Task['taskType'];
  priority: Task['priority'];
  estimatedMinutes: number;
  deadline: Timestamp;
  source: Task['source'];
}

/** Create a new task document. Returns the new document ID. */
export async function createTask(input: CreateTaskInput): Promise<string> {
  const ref = await addDoc(tasksCol, {
    ...input,
    status: 'pending' as const,
    aiReasoningLog: [],
    checkpointMet: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Partial update of a task.
 * Coding-style.md: "always set updatedAt via serverTimestamp. Never use new Date()."
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
): Promise<void> {
  await updateDoc(doc(tasksCol, taskId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

/** Delete a task document. */
export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(tasksCol, taskId));
}

/** One-time fetch of a single task. */
export async function getTask(taskId: string): Promise<Task | null> {
  const snap = await getDoc(doc(tasksCol, taskId).withConverter(taskConverter));
  return snap.exists() ? snap.data() : null;
}
