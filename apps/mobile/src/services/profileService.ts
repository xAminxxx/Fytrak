/**
 * Profile Service — User profile CRUD, onboarding, and metrics.
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
import { db, auth } from "../config/firebase";
import { appEnv } from "../config/env";
import type { AssignmentStatus, SessionState, UserRole } from "../state/types";
import { authenticatedSessionState, defaultSessionData, toSessionState } from "../state/session";
import { toLocalDateKey } from "../utils/dateKeys";

export type ProfileLevel = "Beginner" | "Intermediate" | "Advanced";

export type UserProfile = {
  gender?: "male" | "female" | null;
  goal?: string;
  level?: ProfileLevel;
  injuries?: string;
  name?: string;
  profileImageUrl?: string;
  macroTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  weight?: number;
  height?: number;
  birthDate?: string;
  activityLevel?: string;
  city?: string;
  country?: string;
  workoutProfileCompleted?: boolean;
  nutritionProfileCompleted?: boolean;
  isPremium?: boolean;
  lastTrainedDate?: string;
  work?: {
    toughness: number;
    timing: string;
    stress: number;
  };
  trainingExperience?: string;
  healthIssues?: string;
  flexibility?: number;
  medical?: {
    allergies: string;
    medications: string;
  };
  lifestyle?: {
    smoker: boolean;
    cigarettesPerDay: number;
    coffeePerDay: number;
    alcoholPerDay: number;
    sleepHours: number;
    sleepTiming: string;
  };
  nutrition?: {
    specificDishes: string;
    supplements: string;
    regularEating: boolean;
  };
  assignmentStatus?: AssignmentStatus;
  selectedCoachId?: string | null;
  selectedCoachName?: string | null;
  coachProfile?: {
    bio: string;
    specialties: string[];
    experience: number;
  };
};

export type CompleteProfilePayload = {
  goal: string | null;
  weight: number;
  height: number;
  birthday: string;
  gender?: "male" | "female" | null;
  level?: string | null;
  city?: string;
  country?: string;
  macroTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
};

export type WorkoutIntakePayload = {
  level: ProfileLevel;
  lastTrainedDate: string;
  trainingExperience: string;
  healthIssues: string;
  flexibility: number;
  injuries: string;
  work: {
    toughness: number;
    timing: string;
    stress: number;
  };
};

export type NutritionIntakePayload = {
  activityLevel: string;
  medical: {
    allergies: string;
    medications: string;
  };
  lifestyle: {
    smoker: boolean;
    cigarettesPerDay: number;
    coffeePerDay: number;
    alcoholPerDay: number;
    sleepHours: number;
    sleepTiming: string;
  };
  nutrition: {
    specificDishes: string;
    supplements: string;
    regularEating: boolean;
  };
};

export type BodyMetric = {
  id: string;
  weight: number;
  bodyFat?: number;
  date: string;
  createdAt: any;
};

export type ProgressPhoto = {
  id: string;
  url: string;
  date: string;
  type: "front" | "side" | "back";
  createdAt: any;
};

const usersCollection = "users";

// --- SESSION ---

export const ensureUserSession = async (uid: string, initialRole?: UserRole): Promise<SessionState> => {
  const ref = doc(db, usersCollection, uid);
  const snapshot = await getDoc(ref);
  const authUser = auth.currentUser;

  if (!snapshot.exists()) {
    const initialData = {
      ...defaultSessionData,
      role: initialRole || defaultSessionData.role,
      name: authUser?.displayName || "Anonymous",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, initialData);
    return toSessionState(initialData);
  }

  const data = snapshot.data();
  if (authUser?.displayName && data?.name !== authUser.displayName) {
    await setDoc(ref, { name: authUser.displayName }, { merge: true });
  }
  return toSessionState(data);
};

export const subscribeToSessionState = (uid: string, callback: (session: SessionState) => void) => {
  const ref = doc(db, usersCollection, uid);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(toSessionState(snapshot.data()));
      } else {
        callback(authenticatedSessionState());
      }
    },
    (error) => {
      console.error("[ProfileService] Session sync failed:", error);
      callback(authenticatedSessionState());
    }
  );
};

// --- PROFILE CRUD ---

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile) => void) => {
  const ref = doc(db, usersCollection, uid);
  return onSnapshot(ref, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        goal: data.profile?.goal || data.goal || "Not set",
        level: data.profile?.level,
        injuries: data.profile?.injuries,
        name: data.name,
        macroTargets: data.macroTargets || { calories: 2100, protein: 160, carbs: 220, fats: 65 },
        workoutProfileCompleted: data.workoutProfileCompleted || false,
        nutritionProfileCompleted: data.nutritionProfileCompleted || false,
        isPremium: data.isPremium || false,
        lifestyle: data.profile?.lifestyle || data.lifestyle,
        work: data.profile?.work || data.work,
        weight: data.profile?.weight || data.weight,
        height: data.profile?.height || data.height,
        activityLevel: data.profile?.activityLevel || data.activityLevel,
        profileImageUrl: data.profileImageUrl,
      });
    }
  });
};

export const saveCompleteProfile = async (uid: string, payload: CompleteProfilePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, {
    profileCompleted: true,
    profile: {
      goal: payload.goal ? payload.goal.trim() : "",
      weight: payload.weight,
      height: payload.height,
      birthDate: payload.birthday,
      gender: payload.gender || null,
      level: payload.level || null,
      city: payload.city?.trim() || "",
      country: payload.country?.trim() || "",
    },
    workoutProfileCompleted: false,
    nutritionProfileCompleted: false,
    macroTargets: payload.macroTargets || { calories: 2100, protein: 160, carbs: 220, fats: 65 },
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const saveWorkoutIntake = async (uid: string, payload: WorkoutIntakePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, {
    workoutProfileCompleted: true,
    profile: payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const saveNutritionIntake = async (uid: string, payload: NutritionIntakePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, {
    nutritionProfileCompleted: true,
    profile: payload,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const saveUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
};

export const saveUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, { role, updatedAt: serverTimestamp() }, { merge: true });
};

// --- ASSIGNMENT ---

export const saveCoachRequest = async (uid: string, coach: { id: string; name: string }): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, {
    assignmentStatus: "pending",
    selectedCoachId: coach.id,
    selectedCoachName: coach.name,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const saveAssignmentStatus = async (uid: string, status: AssignmentStatus): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  const updateData: any = { assignmentStatus: status, updatedAt: serverTimestamp() };
  if (status === "unassigned") {
    updateData.selectedCoachId = null;
    updateData.selectedCoachName = null;
  }
  await setDoc(ref, updateData, { merge: true });
};

// --- BODY METRICS ---

export const saveBodyMetric = async (uid: string, metric: { weight: number; bodyFat?: number }): Promise<void> => {
  const today = toLocalDateKey();
  const collRef = collection(db, usersCollection, uid, "metrics");
  const userRef = doc(db, usersCollection, uid);

  const data: any = { weight: Number(metric.weight), date: today, createdAt: serverTimestamp() };
  const profileUpdates: any = { weight: Number(metric.weight), updatedAt: serverTimestamp() };

  if (metric.bodyFat !== undefined && metric.bodyFat !== null) {
    const bf = Number(metric.bodyFat);
    data.bodyFat = bf;
    profileUpdates.bodyFat = bf;
  }

  const todayQuery = query(collRef, where("date", "==", today));
  const existing = await getDocs(todayQuery);

  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    await setDoc(doc(db, usersCollection, uid, "metrics", existingDoc.id), data);
  } else {
    await addDoc(collRef, data);
  }

  await setDoc(userRef, { profile: profileUpdates }, { merge: true });
};

export const subscribeToLatestMetrics = (uid: string, callback: (metrics: BodyMetric[]) => void) => {
  const q = query(collection(db, usersCollection, uid, "metrics"), orderBy("createdAt", "desc"), limit(30));
  return onSnapshot(q, (snapshot) => {
    const metrics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BodyMetric));
    callback(metrics);
  });
};

// --- PROGRESS PHOTOS ---

export const saveProgressPhoto = async (uid: string, photo: Omit<ProgressPhoto, "id" | "createdAt">): Promise<void> => {
  const ref = collection(db, usersCollection, uid, "photos");
  await addDoc(ref, { ...photo, createdAt: serverTimestamp() });
};

export const subscribeToProgressPhotos = (uid: string, callback: (photos: ProgressPhoto[]) => void) => {
  const q = query(collection(db, usersCollection, uid, "photos"), orderBy("createdAt", "desc"), limit(20));
  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProgressPhoto));
    callback(photos);
  });
};

export const deleteProgressPhoto = async (uid: string, photoId: string): Promise<void> => {
  const ref = doc(db, usersCollection, uid, "photos", photoId);
  await deleteDoc(ref);
};

// --- PROFILE IMAGE ---

export async function uploadProfileImage(userId: string, uri: string) {
  try {
    const uploadEndpoint = `https://api.cloudinary.com/v1_1/${appEnv.cloudinary.cloudName}/image/upload`;
    const data = new FormData();
    data.append('file', { uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);
    data.append('upload_preset', appEnv.cloudinary.uploadPreset);
    data.append('cloud_name', appEnv.cloudinary.cloudName);
    data.append('folder', `fytrak/profiles/${userId}`);

    const response = await fetch(uploadEndpoint, { method: 'POST', body: data });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ProfileService] Cloudinary Error:", errorText);
      throw new Error(`Cloudinary upload failed with status ${response.status}`);
    }
    const result = await response.json();
    const downloadUrl = result.secure_url;
    if (!downloadUrl) throw new Error(result.error?.message || "Cloudinary upload failed");

    await saveUserProfile(userId, { profileImageUrl: downloadUrl });
    return downloadUrl;
  } catch (e) {
    console.error("Cloudinary profile upload failed:", e);
    throw e;
  }
}
