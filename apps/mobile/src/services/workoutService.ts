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
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { toLocalDateKey } from "../utils/dateKeys";

import type { WorkoutSetType, WorkoutSet, WorkoutLog, PrescribedWorkout } from "../types/domain";
export type { WorkoutSetType, WorkoutSet, WorkoutLog, PrescribedWorkout };

export type WorkoutCheckIn = {
  energy: number;
  soreness: number;
  mood: number;
};

const usersCollection = "users";

// --- WORKOUT LOGGING ---

export const saveWorkoutLog = async (uid: string, workout: Omit<WorkoutLog, "id">): Promise<void> => {
  const ref = collection(db, usersCollection, uid, "workouts");
  await addDoc(ref, {
    ...workout,
    date: workout.date || toLocalDateKey(),
    createdAt: serverTimestamp(),
  });
};

export const subscribeToWorkouts = (uid: string, callback: (workouts: WorkoutLog[]) => void) => {
  const q = query(collection(db, usersCollection, uid, "workouts"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutLog));
    callback(workouts);
  });
};

export const subscribeToDailyWorkouts = (
  uid: string,
  dateKey: string,
  callback: (workouts: WorkoutLog[]) => void
) => {
  const q = query(
    collection(db, usersCollection, uid, "workouts"),
    where("date", "==", dateKey),
    orderBy("createdAt", "desc"),
    limit(10)
  );
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
