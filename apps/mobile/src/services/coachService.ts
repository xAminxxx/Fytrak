/**
 * Coach Service — Coach profiles, trainee management, and templates.
 * Part of Feature-Sliced Design (FSD) refactoring.
 */
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { localDateKeyDaysAgo } from "../utils/dateKeys";
import type { ClientSummary } from "./clientSummaryService";

export type Coach = {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  clients: number;
  verified: boolean;
  responseTime: string;
  avatarUrl?: string;
};

export type CoachProfilePayload = {
  bio: string;
  specialties: string[];
  experience: number;
};

export type CoachRequestPayload = {
  id: string;
  name: string;
};

export type CoachTemplate = {
  id: string;
  coachId: string;
  type: "workout" | "meal";
  title: string;
  data: any;
  createdAt: any;
};

export type CoachTrainee = {
  id: string;
  name?: string;
  profile?: {
    goalText?: string;
    goal?: string;
  };
  macroTargets?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fats?: number;
  };
  assignmentStatus?: "assigned" | "pending" | "rejected" | "expired" | "unassigned";
  selectedCoachId?: string | null;
  selectedCoachName?: string | null;
  clientSummary?: ClientSummary;
};

export type CoachClientSignal = {
  traineeId: string;
  lastWorkoutAt: Date | null;
  workoutsLast7Days: number;
  mealsLast7Days: number;
  avgDailyProtein: number;
  proteinTarget: number | null;
};

const usersCollection = "users";

// --- COACH PROFILE ---

export const saveCoachProfile = async (uid: string, payload: CoachProfilePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, {
    profileCompleted: true,
    coachProfile: {
      bio: payload.bio.trim(),
      specialties: payload.specialties,
      experience: payload.experience,
    },
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const fetchCoaches = async (): Promise<Coach[]> => {
  const q = query(collection(db, usersCollection), where("role", "==", "coach"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    const cp = data.coachProfile;
    return {
      id: doc.id,
      name: data.name || "Unknown Coach",
      specialties: cp?.specialties || ["Professional Coach"],
      rating: data.rating || 4.9,
      clients: data.clients || 0,
      verified: data.verified || false,
      responseTime: data.responseTime || "Fast",
      avatarUrl: data.avatarUrl,
    };
  });
};

// --- TRAINEE MANAGEMENT ---

export const subscribeToCoachTrainees = (coachId: string, callback: (trainees: CoachTrainee[]) => void) => {
  const q = query(collection(db, usersCollection), where("selectedCoachId", "==", coachId));
  return onSnapshot(q, (snapshot) => {
    const trainees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoachTrainee));
    callback(trainees);
  });
};

export const fetchCoachClientSignal = async (trainee: CoachTrainee): Promise<CoachClientSignal> => {
  if (trainee.clientSummary?.workoutsLast7Days !== undefined || trainee.clientSummary?.mealsLast7Days !== undefined) {
    const lastWorkoutAt = trainee.clientSummary?.lastWorkoutAt?.toDate
      ? trainee.clientSummary.lastWorkoutAt.toDate()
      : trainee.clientSummary?.lastWorkoutAt
        ? new Date(trainee.clientSummary.lastWorkoutAt)
        : null;

    return {
      traineeId: trainee.id,
      lastWorkoutAt: lastWorkoutAt && !Number.isNaN(lastWorkoutAt.getTime()) ? lastWorkoutAt : null,
      workoutsLast7Days: trainee.clientSummary?.workoutsLast7Days ?? 0,
      mealsLast7Days: trainee.clientSummary?.mealsLast7Days ?? 0,
      avgDailyProtein: trainee.clientSummary?.avgDailyProtein ?? 0,
      proteinTarget: trainee.macroTargets?.protein ?? null,
    };
  }

  const workoutSnapshot = await getDocs(
    query(
      collection(db, usersCollection, trainee.id, "workouts"),
      orderBy("createdAt", "desc"),
      limit(20)
    )
  );
  const mealSnapshot = await getDocs(
    query(
      collection(db, usersCollection, trainee.id, "meals"),
      where("date", ">=", localDateKeyDaysAgo(6))
    )
  );

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const workouts = workoutSnapshot.docs.map((workoutDoc) => workoutDoc.data());
  const workoutsLast7Days = workouts.filter((workout) => {
    const createdAt = workout.createdAt?.toDate ? workout.createdAt.toDate() : null;
    return createdAt ? createdAt.getTime() >= sevenDaysAgo : false;
  }).length;
  const lastWorkoutAt = workouts[0]?.createdAt?.toDate ? workouts[0].createdAt.toDate() as Date : null;

  const meals = mealSnapshot.docs.map((mealDoc) => mealDoc.data());
  const totalProtein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);

  return {
    traineeId: trainee.id,
    lastWorkoutAt,
    workoutsLast7Days,
    mealsLast7Days: meals.length,
    avgDailyProtein: Math.round(totalProtein / 7),
    proteinTarget: trainee.macroTargets?.protein ?? null,
  };
};

export const fetchCoachClientSignals = async (trainees: CoachTrainee[]): Promise<CoachClientSignal[]> => {
  return Promise.all(trainees.map(fetchCoachClientSignal));
};

export const respondToTraineeRequest = async (traineeId: string, accept: boolean): Promise<void> => {
  const ref = doc(db, usersCollection, traineeId);
  await setDoc(ref, {
    assignmentStatus: accept ? "assigned" : "rejected",
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// --- TEMPLATES ---

export const saveCoachTemplate = async (coachId: string, template: Omit<CoachTemplate, "id" | "coachId" | "createdAt">): Promise<void> => {
  const ref = collection(db, usersCollection, coachId, "templates");
  await addDoc(ref, { ...template, coachId, createdAt: serverTimestamp() });
};

export const updateCoachTemplate = async (coachId: string, templateId: string, updates: Partial<CoachTemplate>): Promise<void> => {
  const ref = doc(db, usersCollection, coachId, "templates", templateId);
  await setDoc(ref, updates, { merge: true });
};

export const subscribeToCoachTemplates = (coachId: string, type: "workout" | "meal" | null, callback: (templates: CoachTemplate[]) => void) => {
  const coll = collection(db, usersCollection, coachId, "templates");
  const q = type ? query(coll, where("type", "==", type)) : query(coll);
  return onSnapshot(q, (snapshot) => {
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CoachTemplate)).sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(templates);
  });
};

export const deleteCoachTemplate = async (coachId: string, templateId: string): Promise<void> => {
  const ref = doc(db, usersCollection, coachId, "templates", templateId);
  await deleteDoc(ref);
};
