import { collection, addDoc, query, where, onSnapshot, serverTimestamp, setDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { toLocalDateKey } from "../utils/dateKeys";

export const saveWaterIntake = async (uid: string, ml: number): Promise<void> => {
  const today = toLocalDateKey();
  const ref = collection(db, "users", uid, "water");
  
  const q = query(ref, where("date", "==", today));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const existing = snap.docs[0];
    await setDoc(doc(db, "users", uid, "water", existing.id), { 
      amount: (existing.data().amount || 0) + ml,
      updatedAt: serverTimestamp() 
    }, { merge: true });
  } else {
    await addDoc(ref, { amount: ml, date: today, createdAt: serverTimestamp() });
  }
};

export const setWaterIntake = async (uid: string, ml: number): Promise<void> => {
  const today = toLocalDateKey();
  const ref = collection(db, "users", uid, "water");
  const q = query(ref, where("date", "==", today));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    await setDoc(doc(db, "users", uid, "water", snap.docs[0].id), { amount: ml, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await addDoc(ref, { amount: ml, date: today, createdAt: serverTimestamp() });
  }
};

export const subscribeToDailyWater = (uid: string, callback: (ml: number) => void) => {
  const today = toLocalDateKey();
  const q = query(collection(db, "users", uid, "water"), where("date", "==", today));
  return onSnapshot(q, (snapshot) => {
    if (!snapshot.empty) {
      callback(snapshot.docs[0].data().amount || 0);
    } else {
      callback(0);
    }
  });
};
