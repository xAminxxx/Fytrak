import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  onSnapshot,
  query,
  where,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  orderBy,
  limit,
  type DocumentData,
} from "firebase/firestore";
import { db, auth } from "../config/firebase";
import type { AssignmentStatus, SessionState, UserRole } from "../state/types";

export type ProfileLevel = "Beginner" | "Intermediate" | "Advanced";

export type UserProfile = {
  goal?: string;
  level?: ProfileLevel;
  injuries?: string;
  name?: string;
  macroTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  coachProfile?: {
    bio: string;
    specialties: string[];
    experience: number;
  };
};

export type CompleteProfilePayload = {
  goal: string;
  level: ProfileLevel;
  injuries: string;
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

export type Meal = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  time: string;
  date: string;
  createdAt?: any;
};

export type WorkoutCheckIn = {
  energy: number;   // 1-5
  soreness: number; // 1-10
  mood: number;     // 1-5
};

export type WorkoutLog = {
  id: string;
  name: string;
  exercises: {
    name: string;
    sets: { reps: string; weight: string; rpe: string; isCompleted: boolean }[];
  }[];
  duration?: number;
  checkIn?: WorkoutCheckIn;
  createdAt?: any;
};

export type BodyMetric = {
  id: string;
  weight: number;
  bodyFat?: number;
  date: string;
  createdAt: any;
};

export type PrescribedWorkout = {
  id: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: string;
    restTime?: string;
  }[];
  isCompleted: boolean;
  assignedAt: any;
};

export type ProgressPhoto = {
  id: string;
  url: string; // Base64 or URL
  date: string;
  type: "front" | "side" | "back";
  createdAt: any;
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

export type CoachTemplate = {
  id: string;
  coachId: string;
  type: "workout" | "meal";
  title: string;
  data: any; // Workout exercises or Meal data
  createdAt: any;
};

const usersCollection = "users";

const defaultSessionData = {
  role: "trainee" as UserRole,
  profileCompleted: false,
  assignmentStatus: "unassigned" as AssignmentStatus,
  selectedCoachId: null as string | null,
  selectedCoachName: null as string | null,
};

const toSessionState = (input: DocumentData | undefined): SessionState => {
  const role = input?.role === "coach" ? "coach" : "trainee";

  const assignmentStatus =
    input?.assignmentStatus === "pending" ||
      input?.assignmentStatus === "assigned" ||
      input?.assignmentStatus === "rejected" ||
      input?.assignmentStatus === "expired"
      ? input.assignmentStatus
      : "unassigned";

  return {
    isAuthenticated: true,
    role,
    profileCompleted: Boolean(input?.profileCompleted),
    assignmentStatus,
    selectedCoachId: typeof input?.selectedCoachId === "string" ? input.selectedCoachId : null,
    selectedCoachName: typeof input?.selectedCoachName === "string" ? input.selectedCoachName : null,
  };
};

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

    return {
      isAuthenticated: true,
      ...initialData,
      selectedCoachId: null,
      selectedCoachName: null,
    };
  }

  const data = snapshot.data();
  if (authUser?.displayName && data?.name !== authUser.displayName) {
    await setDoc(ref, { name: authUser.displayName }, { merge: true });
  }

  return toSessionState(data);
};

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
        macroTargets: data.macroTargets || {
          calories: 2100,
          protein: 160,
          carbs: 220,
          fats: 65,
        },
      });
    }
  });
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

export const saveCompleteProfile = async (uid: string, payload: CompleteProfilePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);

  await setDoc(
    ref,
    {
      profileCompleted: true,
      profile: {
        goal: payload.goal.trim(),
        level: payload.level,
        injuries: payload.injuries.trim(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveCoachProfile = async (uid: string, payload: CoachProfilePayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);

  await setDoc(
    ref,
    {
      profileCompleted: true,
      coachProfile: {
        bio: payload.bio.trim(),
        specialties: payload.specialties,
        experience: payload.experience,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveUserProfile = async (uid: string, profile: Partial<UserProfile>): Promise<void> => {
  const ref = doc(db, usersCollection, uid);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
};

export const saveCoachRequest = async (uid: string, coach: CoachRequestPayload): Promise<void> => {
  const ref = doc(db, usersCollection, uid);

  await setDoc(
    ref,
    {
      assignmentStatus: "pending",
      selectedCoachId: coach.id,
      selectedCoachName: coach.name,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveAssignmentStatus = async (uid: string, status: AssignmentStatus): Promise<void> => {
  const ref = doc(db, usersCollection, uid);

  const updateData: any = {
    assignmentStatus: status,
    updatedAt: serverTimestamp(),
  };

  // If disconnecting, clear the coach identity data
  if (status === "unassigned") {
    updateData.selectedCoachId = null;
    updateData.selectedCoachName = null;
  }

  await setDoc(ref, updateData, { merge: true });
};

export const saveUserRole = async (uid: string, role: UserRole): Promise<void> => {
  const ref = doc(db, usersCollection, uid);

  await setDoc(
    ref,
    {
      role,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const subscribeToCoachTrainees = (coachId: string, callback: (trainees: any[]) => void) => {
  const q = query(
    collection(db, usersCollection),
    where("selectedCoachId", "==", coachId)
  );

  return onSnapshot(q, (snapshot) => {
    const trainees = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(trainees);
  });
};

export const respondToTraineeRequest = async (traineeId: string, accept: boolean): Promise<void> => {
  const ref = doc(db, usersCollection, traineeId);
  await setDoc(
    ref,
    {
      assignmentStatus: accept ? "assigned" : "rejected",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const saveMealLog = async (uid: string, meal: Omit<Meal, "id" | "date">): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const ref = collection(db, usersCollection, uid, "meals");

  await addDoc(ref, {
    ...meal,
    date: today,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToDailyMeals = (uid: string, callback: (meals: Meal[]) => void) => {
  const today = new Date().toISOString().split("T")[0];
  const q = query(
    collection(db, usersCollection, uid, "meals"),
    where("date", "==", today)
  );

  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Meal)).sort((a, b) => {
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

export const saveWorkoutLog = async (uid: string, workout: Omit<WorkoutLog, "id">): Promise<void> => {
  const ref = collection(db, usersCollection, uid, "workouts");
  await addDoc(ref, {
    ...workout,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToWorkouts = (uid: string, callback: (workouts: WorkoutLog[]) => void) => {
  const q = query(
    collection(db, usersCollection, uid, "workouts"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const workouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WorkoutLog));
    callback(workouts);
  });
};

export const saveBodyMetric = async (uid: string, metric: { weight: number; bodyFat?: number }): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];
  const ref = collection(db, usersCollection, uid, "metrics");
  await addDoc(ref, {
    ...metric,
    date: today,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToLatestMetrics = (uid: string, callback: (metrics: BodyMetric[]) => void) => {
  const q = query(
    collection(db, usersCollection, uid, "metrics"),
    orderBy("createdAt", "desc"),
    limit(30)
  );

  return onSnapshot(q, (snapshot) => {
    const metrics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BodyMetric));
    callback(metrics);
  });
};

export const savePrescribedWorkout = async (traineeId: string, workout: Omit<PrescribedWorkout, "id" | "assignedAt">): Promise<void> => {
  const ref = collection(db, usersCollection, traineeId, "prescribedWorkouts");
  await addDoc(ref, {
    ...workout,
    assignedAt: serverTimestamp(),
  });
};

export const savePrescribedMeal = async (traineeId: string, meal: Omit<PrescribedMeal, "id" | "assignedAt">): Promise<void> => {
  const ref = collection(db, usersCollection, traineeId, "prescribed_meals");
  await addDoc(ref, {
    ...meal,
    assignedAt: serverTimestamp(),
  });
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

  // 1. Update Profile Targets
  await setDoc(traineeRef, {
    macroTargets: macros
  }, { merge: true });

  // 2. Mark Plan as Applied
  await setDoc(mealRef, {
    isApplied: true
  }, { merge: true });
};

export const completePrescribedWorkout = async (traineeId: string, workoutId: string): Promise<void> => {
  const ref = doc(db, usersCollection, traineeId, "prescribedWorkouts", workoutId);
  await setDoc(ref, { isCompleted: true }, { merge: true });
};

export const subscribeToHistoricalMeals = (uid: string, days: number, callback: (meals: Meal[]) => void) => {
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const dateStr = dateLimit.toISOString().split("T")[0];

  const q = query(
    collection(db, usersCollection, uid, "meals"),
    where("date", ">=", dateStr)
  );

  return onSnapshot(q, (snapshot) => {
    const meals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Meal)).sort((a, b) => b.date.localeCompare(a.date));
    callback(meals);
  });
};

export const saveProgressPhoto = async (uid: string, photo: Omit<ProgressPhoto, "id" | "createdAt">): Promise<void> => {
  const ref = collection(db, usersCollection, uid, "photos");
  await addDoc(ref, {
    ...photo,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToProgressPhotos = (uid: string, callback: (photos: ProgressPhoto[]) => void) => {
  const q = query(
    collection(db, usersCollection, uid, "photos"),
    orderBy("createdAt", "desc"),
    limit(20)
  );

  return onSnapshot(q, (snapshot) => {
    const photos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProgressPhoto));
    callback(photos);
  });
};

// --- COACH LIBRARY TEMPLATES ---

export const saveCoachTemplate = async (coachId: string, template: Omit<CoachTemplate, "id" | "coachId" | "createdAt">): Promise<void> => {
  const ref = collection(db, usersCollection, coachId, "templates");
  await addDoc(ref, {
    ...template,
    coachId,
    createdAt: serverTimestamp(),
  });
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
