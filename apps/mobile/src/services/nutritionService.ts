/**
 * Nutrition Service — Meal logging, prescribed meal plans, and macro tracking.
 * Part of Feature-Sliced Design (FSD) refactoring.
 */
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  time: string;
  date: string;
  imageUrl?: string;
  createdAt?: any;
};

export type PrescribedMeal = {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  isApplied: boolean;
  assignedAt: any;
};

const usersCollection = "users";

// --- MEAL LOGGING ---

export const saveMealLog = async (uid: string, meal: Omit<Meal, "id" | "date" | "createdAt">): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const ref = collection(db, usersCollection, uid, "meals");
  await addDoc(ref, { ...meal, date: today, createdAt: serverTimestamp() });
};

export const subscribeToDailyMeals = (uid: string, callback: (meals: Meal[]) => void) => {
  const today = new Date().toISOString().split("T")[0];
  const q = query(collection(db, usersCollection, uid, "meals"), where("date", "==", today));
  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)).sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(meals);
  });
};

export const deleteMealLog = async (uid: string, mealId: string): Promise<void> => {
  const ref = doc(db, usersCollection, uid, "meals", mealId);
  await deleteDoc(ref);
};

export const subscribeToHistoricalMeals = (uid: string, days: number, callback: (meals: Meal[]) => void) => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const dateStr = dateLimit.toISOString().split("T")[0];

  const q = query(collection(db, usersCollection, uid, "meals"), where("date", ">=", dateStr));
  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)).sort((a, b) => b.date.localeCompare(a.date));
    callback(meals);
  });
};

// --- PRESCRIBED MEALS ---

export const savePrescribedMeal = async (traineeId: string, meal: Omit<PrescribedMeal, "id" | "assignedAt">): Promise<void> => {
  const ref = collection(db, usersCollection, traineeId, "prescribed_meals");
  await addDoc(ref, { ...meal, assignedAt: serverTimestamp() });
};

export const subscribeToPrescribedMeals = (traineeId: string, callback: (meals: PrescribedMeal[]) => void) => {
  const q = query(
    collection(db, usersCollection, traineeId, "prescribed_meals"),
    where("isApplied", "==", false)
  );
  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PrescribedMeal)).sort((a, b) => {
      const timeA = a.assignedAt?.seconds || 0;
      const timeB = b.assignedAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(meals);
  });
};

export const applyPrescribedMeal = async (traineeId: string, mealId: string, macros: PrescribedMeal["macros"]): Promise<void> => {
  const traineeRef = doc(db, usersCollection, traineeId);
  const mealRef = doc(db, usersCollection, traineeId, "prescribed_meals", mealId);
  await setDoc(traineeRef, { macroTargets: macros }, { merge: true });
  await setDoc(mealRef, { isApplied: true }, { merge: true });
};
