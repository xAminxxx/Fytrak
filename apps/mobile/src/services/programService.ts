/**
 * Program Service — Multi-week training program hierarchy.
 * Part of Feature-Sliced Design (FSD) refactoring.
 */
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import type { WorkoutSetType } from "./workoutService";

export type ProgramSuggestedSet = {
  type: WorkoutSetType;
  targetReps?: number;
  targetWeight?: number;
  targetDurationSec?: number;
};

export type ProgramSessionExercise = {
  name: string;
  instructions?: string;
  restTimeSec?: number;
  suggestedSets: ProgramSuggestedSet[];
};

export type ProgramSession = {
  id: string;
  sessionNumber: number;
  title: string;
  description?: string;
  estimatedMinutes: number;
  exercises: ProgramSessionExercise[];
  isCompleted: boolean;
};

export type ProgramWeek = {
  id: string;
  weekNumber: number;
  title: string;
  sessions: ProgramSession[];
};

export type Program = {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  durationWeeks: number;
  weeks: ProgramWeek[];
  assignedAt: any;
};

const usersCollection = "users";

// --- PROGRAM CRUD ---

export const saveProgram = async (coachId: string, traineeId: string, program: Omit<Program, "id" | "coachId" | "coachName" | "assignedAt">): Promise<void> => {
  const ref = collection(db, usersCollection, traineeId, "programs");
  const coachSnapshot = await getDoc(doc(db, usersCollection, coachId));
  const coachName = coachSnapshot.data()?.name || "Unknown Coach";
  await addDoc(ref, { ...program, coachId, coachName, assignedAt: serverTimestamp() });
};

export const subscribeToTraineePrograms = (uid: string, callback: (programs: Program[]) => void) => {
  const q = query(collection(db, usersCollection, uid, "programs"), orderBy("assignedAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const programs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Program));
    callback(programs);
  });
};
