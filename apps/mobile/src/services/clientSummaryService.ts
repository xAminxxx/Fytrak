import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
  where,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { localDateKeyDaysAgo } from "../utils/dateKeys";

export type ClientSummary = {
  workoutsLast7Days?: number;
  mealsLast7Days?: number;
  avgDailyProtein?: number;
  lastWorkoutAt?: any;
  lastMealAt?: any;
  lastMessageAt?: any;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  unreadCoachCount?: number;
  updatedAt?: any;
};

const usersCollection = "users";

const safeUpdate = async (uid: string, data: Record<string, unknown>) => {
  const ref = doc(db, usersCollection, uid);
  try {
    await updateDoc(ref, data);
  } catch (error) {
    await setDoc(ref, data, { merge: true });
  }
};

export const updateClientSummaryAfterWorkout = async (uid: string): Promise<void> => {
  const since = Timestamp.fromDate(new Date(Date.now() - 7 * 86400000));
  const q = query(
    collection(db, usersCollection, uid, "workouts"),
    where("createdAt", ">=", since)
  );

  const snapshot = await getDocs(q);
  const workoutsLast7Days = snapshot.size;

  await safeUpdate(uid, {
    "clientSummary.workoutsLast7Days": workoutsLast7Days,
    "clientSummary.lastWorkoutAt": serverTimestamp(),
    "clientSummary.updatedAt": serverTimestamp(),
  });
};

export const updateClientSummaryAfterMeal = async (uid: string): Promise<void> => {
  const dateStr = localDateKeyDaysAgo(6);
  const q = query(
    collection(db, usersCollection, uid, "meals"),
    where("date", ">=", dateStr)
  );

  const snapshot = await getDocs(q);
  const meals = snapshot.docs.map((docSnap) => docSnap.data());
  const totalProtein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0);

  await safeUpdate(uid, {
    "clientSummary.mealsLast7Days": meals.length,
    "clientSummary.avgDailyProtein": Math.round(totalProtein / 7),
    "clientSummary.lastMealAt": serverTimestamp(),
    "clientSummary.updatedAt": serverTimestamp(),
  });
};

export const updateClientSummaryAfterMessage = async (params: {
  traineeId: string;
  senderId: string;
  text: string;
  incrementUnreadForCoach?: boolean;
}): Promise<void> => {
  const updates: Record<string, unknown> = {
    "clientSummary.lastMessageAt": serverTimestamp(),
    "clientSummary.lastMessageText": params.text,
    "clientSummary.lastMessageSenderId": params.senderId,
    "clientSummary.updatedAt": serverTimestamp(),
  };

  if (params.incrementUnreadForCoach) {
    updates["clientSummary.unreadCoachCount"] = increment(1);
  }

  await safeUpdate(params.traineeId, updates);
};

export const clearCoachUnread = async (traineeId: string): Promise<void> => {
  await safeUpdate(traineeId, {
    "clientSummary.unreadCoachCount": 0,
    "clientSummary.updatedAt": serverTimestamp(),
  });
};
