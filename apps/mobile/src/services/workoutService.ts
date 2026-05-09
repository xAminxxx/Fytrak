/**
 * Workout Service — Workout logging, prescriptions, and set tracking.
 * Part of Feature-Sliced Design (FSD) refactoring.
 */
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { updateClientSummaryAfterWorkout } from "./clientSummaryService";

export type WorkoutSetType = "WEIGHT_REPS" | "TIME" | "BODYWEIGHT" | "REPS_ONLY";

export type WorkoutSet = {
  type: WorkoutSetType;
  reps?: number;
  weight?: number;
  durationSec?: number;
  rpe?: string;
  isCompleted: boolean;
};

export type WorkoutCheckIn = {
  energy: number;
  soreness: number;
  mood: number;
};

export type WorkoutLog = {
  id: string;
  name: string;
  exercises: {
    name: string;
    sets: WorkoutSet[];
  }[];
  duration?: number;
  totalVolume?: number;
  checkIn?: WorkoutCheckIn;
  createdAt?: any;
};

export type PrescribedWorkout = {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  exercises: {
    name: string;
    type?: WorkoutSetType;
    targetSets: number;
    targetReps: string;
    restTime?: string;
  }[];
  isCompleted: boolean;
  assignedAt: any;
};

const usersCollection = "users";

// --- WORKOUT LOGGING ---

export const saveWorkoutLog = async (uid: string, workout: Omit<WorkoutLog, "id">): Promise<void> => {
  const ref = collection(db, usersCollection, uid, "workouts");
  await addDoc(ref, { ...workout, createdAt: serverTimestamp() });
  try {
    await updateClientSummaryAfterWorkout(uid);
  } catch (error) {
    console.error("Failed to update workout summary:", error);
  }
};

export const subscribeToWorkouts = (uid: string, callback: (workouts: WorkoutLog[]) => void) => {
  const q = query(collection(db, usersCollection, uid, "workouts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutLog));
    callback(workouts);
  });
};

// --- PRESCRIBED WORKOUTS ---

export const savePrescribedWorkout = async (traineeId: string, workout: Omit<PrescribedWorkout, "id" | "assignedAt">): Promise<void> => {
  const ref = collection(db, usersCollection, traineeId, "prescribedWorkouts");
  await addDoc(ref, { ...workout, assignedAt: serverTimestamp() });
};

export const subscribeToPrescribedWorkouts = (traineeId: string, callback: (workouts: PrescribedWorkout[]) => void) => {
  const q = query(
    collection(db, usersCollection, traineeId, "prescribedWorkouts"),
    where("isCompleted", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PrescribedWorkout)).sort((a, b) => {
      const timeA = a.assignedAt?.seconds || 0;
      const timeB = b.assignedAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(workouts);
  });
};

export const completePrescribedWorkout = async (traineeId: string, workoutId: string): Promise<void> => {
  const ref = doc(db, usersCollection, traineeId, "prescribedWorkouts", workoutId);
  await setDoc(ref, { isCompleted: true }, { merge: true });
};
