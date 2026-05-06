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
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

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

export const subscribeToCoachTrainees = (coachId: string, callback: (trainees: any[]) => void) => {
  const q = query(collection(db, usersCollection), where("selectedCoachId", "==", coachId));
  return onSnapshot(q, (snapshot) => {
    const trainees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(trainees);
  });
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
